"use strict";

const crypto = require('crypto');

const fs = require('fs');

const path = require('path');

const stream = require('stream');

const url = require('url');

const chardet = require('chardet');

const fetch = require('node-fetch');

const lodash = require('lodash');

const mime = require('mime-types');

const urljoin = require('url-join');

const toArray = require('stream-to-array');

const infer = require('tableschema').infer;

const {
  csvParser,
  guessParseOptions
} = require('./parser/csv');

const {
  xlsxParser
} = require('./parser/xlsx');

const DEFAULT_ENCODING = 'utf-8';

const browser = require('./browser-utils/index');

function open(pathOrDescriptor, {
  basePath,
  format
} = {}) {
  let descriptor = null;

  if (browser.isFileFromBrowser(pathOrDescriptor)) {
    return new FileInterface(pathOrDescriptor);
  }

  if (lodash.isPlainObject(pathOrDescriptor)) {
    descriptor = lodash.cloneDeep(pathOrDescriptor);

    if (descriptor.data) {
      return new FileInline(descriptor, {
        basePath
      });
    } else if (descriptor.path) {
      descriptor = Object.assign(parsePath(descriptor.path, basePath), descriptor);
    }
  } else if (lodash.isString(pathOrDescriptor)) {
    descriptor = parsePath(pathOrDescriptor, basePath, format);
  } else {
    throw new TypeError(`Cannot create File with ${pathOrDescriptor}`);
  }

  const isRemote = descriptor.pathType === 'remote' || isUrl(basePath);

  if (isRemote) {
    return new FileRemote(descriptor, {
      basePath
    });
  }

  return new FileLocal(descriptor, {
    basePath
  });
}

class File {
  static load(pathOrDescriptor, {
    basePath,
    format
  } = {}) {
    return open(pathOrDescriptor, {
      basePath,
      format
    });
  }

  constructor(descriptor, {
    basePath
  } = {}) {
    this._descriptor = descriptor;
    this._basePath = basePath;
    this._descriptor.encoding = this.encoding || DEFAULT_ENCODING;
  }

  get descriptor() {
    return this._descriptor;
  }

  get path() {
    throw new Error('This is an abstract base class which you should not instantiate. Use open() instead');
  }

  stream() {
    return null;
  }

  get buffer() {
    return (async () => {
      const stream = await this.stream();
      const buffers = await toArray(stream);
      return Buffer.concat(buffers);
    })();
  }

  rows({
    keyed,
    sheet,
    size
  } = {}) {
    return this._rows({
      keyed,
      sheet,
      size
    });
  }

  _rows({
    keyed,
    sheet,
    size
  } = {}) {
    if (this.descriptor.format in parserDatabase) {
      const parser = parserDatabase[this.descriptor.format];
      return parser(this, {
        keyed,
        sheet,
        size
      });
    }

    throw new Error(`We do not have a parser for that format: ${this.descriptor.format}`);
  }

  async addSchema() {
    if (this.displayName === 'FileInline') {
      this.descriptor.schema = await infer(this.descriptor.data);
      return;
    }

    if (this.descriptor.format === 'xlsx' && this.descriptor.sample) {
      let headers = 1;

      if (lodash.isPlainObject(this.descriptor.sample[0])) {
        headers = Object.keys(this.descriptor.sample[0]);
      }

      this.descriptor.schema = await infer(this.descriptor.sample, {
        headers
      });
      return;
    }

    if (knownTabularFormats.indexOf(this.descriptor.format) === -1) {
      throw new Error('File is not in known tabular format.');
    }

    const parserOptions = await guessParseOptions(this);
    this.descriptor.dialect = {
      delimiter: parserOptions.delimiter,
      quoteChar: parserOptions.quote
    };
    let thisFileStream = await this.stream({
      size: 100
    });
    this.descriptor.schema = await infer(thisFileStream, parserOptions);
  }

}

class FileInterface extends File {
  constructor(descriptor, {
    basePath
  } = {}) {
    super(descriptor, {
      basePath
    });
    this._descriptor.format = descriptor.name.split('.').pop() || '';
  }

  get displayName() {
    return 'FileInterface';
  }

  get path() {
    return URL.createObjectURL(this.descriptor);
  }

  get encoding() {
    return this._encoding || DEFAULT_ENCODING;
  }

  stream({
    size
  } = {}) {
    size = size === -1 ? this.size : size || 0;
    return browser.toNodeStream(this.descriptor.stream().getReader(), size);
  }

  get buffer() {
    return this.descriptor.arrayBuffer();
  }

  get size() {
    return this.descriptor.size;
  }

  get fileName() {
    return this.descriptor.name;
  }

  async hash() {
    const text = await this.descriptor.text();
    return crypto.createHash('md5').update(text).digest('hex');
  }

  async hashSha256() {
    const text = await this.descriptor.text();
    return crypto.createHash('sha256').update(text).digest('hex');
  }

}

class FileLocal extends File {
  get displayName() {
    return 'FileLocal';
  }

  get path() {
    return this._basePath ? path.join(this._basePath, this.descriptor.path) : this.descriptor.path;
  }

  stream({
    end
  } = {}) {
    return fs.createReadStream(this.path, {
      start: 0,
      end
    });
  }

  get size() {
    return fs.statSync(this.path).size;
  }

  get hash() {
    return crypto.createHash('md5').update(fs.readFileSync(this.path)).digest('hex');
  }

  get encoding() {
    if (this.size > 1000000) {
      return chardet.detectFileSync(this.path, {
        sampleSize: 1000000
      });
    }

    return chardet.detectFileSync(this.path);
  }

}

class FileRemote extends File {
  get displayName() {
    return 'FileRemote';
  }

  get path() {
    const isItUrl = isUrl(this.descriptor.path);

    if (isItUrl) {
      return this.descriptor.path;
    } else {
      return this._basePath ? urljoin(this._basePath, this.descriptor.path) : this.descriptor.path;
    }
  }

  get browserBuffer() {
    return (async () => {
      const res = await fetch(this.path);
      return await res.arrayBuffer();
    })();
  }

  stream({
    size = 0
  } = {}) {
    return (async () => {
      const res = await fetch(this.path);

      if (res.status === 200) {
        if (typeof window === 'undefined') {
          return res.body;
        } else {
          return await browser.toNodeStream(res.body.getReader(), size);
        }
      } else {
        throw new Error(`${res.status}: ${res.statusText}. Requested URL: ${this.path}`);
      }
    })();
  }

  get encoding() {
    return this._encoding || DEFAULT_ENCODING;
  }

}

class FileInline extends File {
  constructor(descriptor, {
    basePath
  } = {}) {
    super(descriptor, {
      basePath
    });

    if (lodash.isString(this.descriptor.data)) {
      this._buffer = Buffer.from(this.descriptor.data);
    } else {
      this._buffer = Buffer.from(JSON.stringify(this.descriptor.data));
    }
  }

  get displayName() {
    return 'FileInline';
  }

  get path() {
    return this.descriptor.path;
  }

  get size() {
    return this._buffer.byteLength;
  }

  get hash() {
    return crypto.createHash('md5').update(this._buffer).digest('hex');
  }

  stream() {
    const bufferStream = new stream.PassThrough();
    bufferStream.end(this._buffer);
    return bufferStream;
  }

  rows({
    keyed
  } = {}) {
    if (lodash.isArray(this.descriptor.data)) {
      const rowStream = new stream.PassThrough({
        objectMode: true
      });
      this.descriptor.data.forEach(row => {
        rowStream.write(row);
      });
      rowStream.end();
      return rowStream;
    }

    return this._rows({
      keyed,
      size
    });
  }

}

const parserDatabase = {
  csv: csvParser,
  tsv: csvParser,
  xlsx: xlsxParser,
  xls: xlsxParser
};
const knownTabularFormats = ['csv', 'tsv', 'dsv'];

const parsePath = (path_, basePath = null, format = null) => {
  let fileName;
  const isItUrl = isUrl(path_) || isUrl(basePath);

  if (isItUrl) {
    const urlParts = url.parse(path_);
    fileName = urlParts.pathname.replace(/^.*[\\\/]/, '');

    if (!format && urlParts.query && urlParts.query.includes('format=csv')) {
      format = 'csv';
    }
  } else {
    fileName = path_.replace(/^.*[\\\/]/, '');
  }

  const extension = path.extname(fileName);
  fileName = fileName.replace(extension, '').toLowerCase().trim().replace(/&/g, '-and-').replace(/[^a-z0-9-._]+/g, '-');
  const descriptor = {
    path: path_,
    pathType: isItUrl ? 'remote' : 'local',
    name: fileName,
    format: format ? format : extension.slice(1).toLowerCase()
  };
  const mediatype = mime.lookup(path_);

  if (mediatype) {
    descriptor.mediatype = mediatype;
  }

  return descriptor;
};

const parseDatasetIdentifier = async path_ => {
  const out = {
    name: '',
    owner: null,
    path: '',
    type: '',
    original: path_,
    version: ''
  };
  if (path_ === null || path_ === '') return out;
  out.type = isUrl(path_) ? 'url' : 'local';
  let normalizedPath = path_.replace(/\/?datapackage\.json/, '');
  normalizedPath = normalizedPath.replace(/\/$/, '');

  if (out.type === 'local') {
    if (process.platform === 'win32') {
      out.path = path.resolve(normalizedPath);
    } else {
      out.path = path.posix.resolve(normalizedPath);
    }

    out.name = path.basename(out.path);
  } else if (out.type === 'url') {
    const urlparts = url.parse(normalizedPath);
    const parts = urlparts.pathname.split('/');
    let name = parts[parts.length - 1];
    let owner = null;

    if (urlparts.host === 'github.com') {
      out.type = 'github';
      urlparts.host = 'raw.githubusercontent.com';
      owner = parts[1];
      let repoName = parts[2];
      let branch = 'master';

      if (parts.length < 6) {
        name = repoName;
      }

      if (parts.length == 3) {
        parts.push(branch);
      } else {
        branch = parts[4];
        parts.splice(3, 1);
      }

      urlparts.pathname = parts.join('/');
      out.version = branch;
    } else if (urlparts.host === 'datahub.io') {
      out.type = 'datahub';
      urlparts.host = 'pkgstore.datahub.io';
      owner = parts[1];
      name = parts[2];

      if (owner !== 'core') {
        let resolvedPath = await fetch(`https://api.datahub.io/resolver/resolve?path=${owner}/${name}`);
        resolvedPath = await resolvedPath.json();
        parts[1] = resolvedPath.userid;
      }

      let res = await fetch(`https://api.datahub.io/source/${parts[1]}/${name}/successful`);

      if (res.status >= 400) {
        throw new Error('Provided URL is invalid. Expected URL to a dataset or descriptor.');
      }

      res = await res.json();
      const revisionId = parseInt(res.id.split('/').pop(), 10);
      parts.push(revisionId);
      urlparts.pathname = parts.join('/');
      out.version = revisionId;
    }

    out.name = name;
    out.owner = owner;
    out.path = url.format(urlparts) + '/';
  }

  return out;
};

const isUrl = path_ => {
  const r = new RegExp('^(?:[a-z]+:)?//', 'i');
  return r.test(path_);
};

const isDataset = path_ => {
  if (path_.endsWith('datapackage.json')) {
    return true;
  }

  const isItUrl = isUrl(path_);

  if (isItUrl) {
    return false;
  } else if (fs.lstatSync(path_).isFile()) {
    return false;
  }

  return true;
};

class Dataset {
  constructor(descriptor = {}, identifier = {
    path: null,
    owner: null
  }) {
    if (!lodash.isPlainObject(descriptor)) {
      throw new TypeError(`To create a new Dataset please use Dataset.load`);
    }

    this._descriptor = descriptor;
    this._resources = [];
    this._identifier = identifier;
  }

  static async load(pathOrDescriptor, {
    owner = null
  } = {}) {
    if (!(lodash.isString(pathOrDescriptor) || lodash.isPlainObject(pathOrDescriptor))) {
      throw new TypeError('Dataset needs to be created with descriptor Object or identifier string');
    }

    let descriptor,
        identifier = null;

    if (lodash.isPlainObject(pathOrDescriptor)) {
      descriptor = pathOrDescriptor;
      identifier = {
        path: null,
        owner: owner
      };
    } else {
      descriptor = {};
      identifier = await parseDatasetIdentifier(pathOrDescriptor);
    }

    const dataset = new Dataset(descriptor, identifier);
    await dataset._sync();
    return dataset;
  }

  async _sync() {
    const readmePath = this._path('README.md');

    switch (this.identifier.type) {
      case 'local':
        {
          if (fs.existsSync(this.dataPackageJsonPath)) {
            this._descriptor = JSON.parse(fs.readFileSync(this.dataPackageJsonPath));
            this._originalDescriptor = lodash.cloneDeep(this._descriptor);
          } else {
            throw new Error('No datapackage.json at destination.');
          }

          if (fs.existsSync(readmePath)) {
            this._descriptor.readme = fs.readFileSync(readmePath).toString();
          }

          break;
        }

      case 'url':
      case 'github':
      case 'datahub':
        {
          let res = await fetch(this.dataPackageJsonPath);

          if (res.status >= 400) {
            throw new Error(`${res.status}: ${res.statusText}. Requested URL: ${res.url}`);
          }

          this._descriptor = await res.json();
          this._originalDescriptor = lodash.cloneDeep(this._descriptor);

          if (!this._descriptor.readme) {
            res = await fetch(readmePath);

            if (res.status === 200) {
              this._descriptor.readme = await res.text();
            }
          }

          break;
        }
    }

    this._resources = this.descriptor.resources.map(resource => {
      return open(resource, {
        basePath: this.path
      });
    });
    this.descriptor.resources = this._resources.map(resource => {
      return resource.descriptor;
    });
  }

  get identifier() {
    return this._identifier;
  }

  get descriptor() {
    return this._descriptor;
  }

  get path() {
    return this.identifier.path;
  }

  get dataPackageJsonPath() {
    return this._path('datapackage.json');
  }

  get readme() {
    return this._descriptor.readme;
  }

  get resources() {
    return this._resources;
  }

  addResource(resource) {
    if (lodash.isPlainObject(resource)) {
      this.descriptor.resources.push(resource);
      this.resources.push(open(resource));
    } else if (lodash.isObject(resource)) {
      this.descriptor.resources.push(resource.descriptor);
      this.resources.push(resource);
    } else {
      throw new TypeError(`addResource requires a resource descriptor or an instantiated resources but got: ${resource}`);
    }
  }

  _path(offset = null) {
    const path_ = this.path ? this.path.replace('datapackage.json', '') : this.path;

    switch (this.identifier.type) {
      case 'local':
        return path.join(path_, offset);

      case 'url':
        return urljoin(path_, offset);

      case 'github':
        return urljoin(path_, offset);

      case 'datahub':
        return urljoin(path_, offset);

      case undefined:
        return offset;

      default:
        throw new Error(`Unknown path type: ${this.identifier.type}`);
    }
  }

}

module.exports = {
  open,
  File,
  FileLocal,
  FileRemote,
  FileInline,
  FileInterface,
  parsePath,
  parseDatasetIdentifier,
  isUrl,
  isDataset,
  Dataset,
  xlsxParser,
  csvParser
};