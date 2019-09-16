"use strict";

require("core-js/modules/es6.regexp.to-string");

require("core-js/modules/es6.regexp.constructor");

require("core-js/modules/es6.regexp.split");

require("core-js/modules/es6.regexp.replace");

// File and Dataset objects
const crypto = require('crypto');

const fs = require('fs');

const path = require('path');

const stream = require('stream');

const url = require('url'); // encoding helpers


const chardet = require('chardet');

const fetch = require('node-fetch');

const lodash = require('lodash');

const mime = require('mime-types');

const urljoin = require('url-join');

const toArray = require('stream-to-array');

const infer = require('tableschema').infer;

const {
  csvParser,
  guessParseOptions,
  Uint8ArrayToStringsTransformer
} = require('./parser/csv');

const {
  xlsxParser
} = require('./parser/xlsx');

const DEFAULT_ENCODING = 'utf-8'; // create a File from a pathOrDescriptor

function open(pathOrDescriptor) {
  let {
    basePath,
    format
  } = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  let descriptor = null;

  if (lodash.isPlainObject(pathOrDescriptor)) {
    descriptor = lodash.cloneDeep(pathOrDescriptor); // NB: data must come first - we could have data and path in which path
    // is not used (data comes from data)

    if (descriptor.data) {
      return new FileInline(descriptor, {
        basePath
      });
    } else if (descriptor.path) {
      // We want properties already in our descriptor to take priority over
      // those inferred from path so we assign in this order
      descriptor = Object.assign(parsePath(descriptor.path, basePath), descriptor);
    }
  } else if (lodash.isString(pathOrDescriptor)) {
    descriptor = parsePath(pathOrDescriptor, basePath, format);
  } else {
    throw new TypeError("Cannot create File with ".concat(pathOrDescriptor));
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
} // Abstract Base instance of File


class File {
  // 2019-02-05 kept for backwards compatibility (we factored method out as open)
  // TODO: deprecate this ...
  static load(pathOrDescriptor) {
    let {
      basePath,
      format
    } = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    return open(pathOrDescriptor, {
      basePath,
      format
    });
  }

  constructor(descriptor) {
    let {
      basePath
    } = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
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

  rows() {
    let {
      keyed,
      sheet,
      size
    } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    return this._rows({
      keyed,
      sheet,
      size
    });
  }

  _rows() {
    let {
      keyed,
      sheet,
      size
    } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    if (this.descriptor.format in parserDatabase) {
      const parser = parserDatabase[this.descriptor.format];
      return parser(this, {
        keyed,
        sheet,
        size
      });
    }

    throw new Error("We do not have a parser for that format: ".concat(this.descriptor.format));
  }

  async addSchema() {
    // Ensure file is tabular
    if (knownTabularFormats.indexOf(this.descriptor.format) === -1) {
      throw new Error('File is not in known tabular format.');
    }

    if (this.displayName === 'FileInline') {
      this.descriptor.schema = await infer(this.descriptor.data);
      return;
    } // Get parserOptions so we can use it when "infering" schema:


    const parserOptions = await guessParseOptions(this); // We also need to include parserOptions in "dialect" property of descriptor:

    this.descriptor.dialect = {
      delimiter: parserOptions.delimiter,
      quoteChar: parserOptions.quote // Now let's get a stream from file and infer schema:

    };
    let thisFileStream = await this.stream({
      size: 100
    });
    this.descriptor.schema = await infer(thisFileStream, parserOptions);
  }

}

class FileLocal extends File {
  get displayName() {
    return 'FileLocal';
  }

  get path() {
    return this._basePath ? path.join(this._basePath, this.descriptor.path) : this.descriptor.path;
  }

  stream() {
    let {
      end
    } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    return fs.createReadStream(this.path, {
      start: 0,
      end
    });
  }

  get size() {
    return fs.statSync(this.path).size;
  }

  get hash() {
    return crypto.createHash('md5').update(fs.readFileSync(this.path)).digest('base64');
  }

  get encoding() {
    // When data is huge, we want to optimize performace (in tradeoff of less accuracy):
    // So we are using sample of first 100K bytes here:
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

  stream() {
    let {
      size = 0
    } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    return (async () => {
      const res = await fetch(this.path);

      if (res.status === 200) {
        if (typeof window === 'undefined') {
          return res.body;
        } else {
          // if in browser, return node like stream so that parsers work
          // Running in browser: transform browser's ReadableStream to string, then
          // create a nodejs stream from it:
          const s = new stream.Readable(); // Create a transform stream with our transformer

          const ts = new TransformStream(new Uint8ArrayToStringsTransformer()); // Apply our Transformer on the ReadableStream to create a stream of strings

          const lineStream = res.body.pipeThrough(ts); // Read the stream of strings

          const reader = lineStream.getReader();
          let lineCounter = 0;

          while (true) {
            const {
              done,
              value
            } = await reader.read();
            lineCounter += 1;

            if (done || lineCounter > size && size !== 0) {
              reader.cancel();
              break;
            } // Write each string line to our nodejs stream


            s.push(value + '\r\n');
          }

          s.push(null);
          return s;
        }
      } else {
        throw new Error("".concat(res.status, ": ").concat(res.statusText, ". Requested URL: ").concat(this.path));
      }
    })();
  }

  get encoding() {
    return this._encoding || DEFAULT_ENCODING;
  }

}

class FileInline extends File {
  constructor(descriptor) {
    let {
      basePath
    } = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    super(descriptor, {
      basePath
    }); // JSON is special case ...

    if (lodash.isString(this.descriptor.data)) {
      this._buffer = Buffer.from(this.descriptor.data);
    } else {
      // It is json/javascript
      this._buffer = Buffer.from(JSON.stringify(this.descriptor.data));
    }
  }

  get displayName() {
    return 'FileInline';
  } // Not really sure this should exist here ... - have it for tests atm


  get path() {
    return this.descriptor.path;
  }

  get size() {
    return this._buffer.byteLength;
  }

  get hash() {
    return crypto.createHash('md5').update(this._buffer).digest('base64');
  }

  stream() {
    const bufferStream = new stream.PassThrough();
    bufferStream.end(this._buffer);
    return bufferStream;
  }

  rows() {
    let {
      keyed
    } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

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

} // Available parsers per file format


const parserDatabase = {
  csv: csvParser,
  tsv: csvParser,
  xlsx: xlsxParser,
  xls: xlsxParser // List of formats that are known as tabular

};
const knownTabularFormats = ['csv', 'tsv', 'dsv'];

const parsePath = function parsePath(path_) {
  let basePath = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  let format = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
  let fileName;
  const isItUrl = isUrl(path_) || isUrl(basePath);

  if (isItUrl) {
    const urlParts = url.parse(path_); // eslint-disable-next-line no-useless-escape

    fileName = urlParts.pathname.replace(/^.*[\\\/]/, ''); // Check if format=csv is provided in the query
    // But if format is provided explicitely by user then it'll be used

    if (!format && urlParts.query && urlParts.query.includes('format=csv')) {
      format = 'csv';
    }
  } else {
    // eslint-disable-next-line no-useless-escape
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
    let owner = null; // is this a github repository?

    if (urlparts.host === 'github.com') {
      out.type = 'github'; // yes, modify url for raw file server

      urlparts.host = 'raw.githubusercontent.com';
      owner = parts[1];
      let repoName = parts[2];
      let branch = 'master'; // is the path a repository root?

      if (parts.length < 6) {
        // yes, use the repository name for the package name
        name = repoName;
      } // does the path contain subfolders (after the repository name)?


      if (parts.length == 3) {
        // no, add 'master' branch
        parts.push(branch);
      } else {
        // yes, extract the branch and remove the 'tree' part
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
        let resolvedPath = await fetch("https://api.datahub.io/resolver/resolve?path=".concat(owner, "/").concat(name));
        resolvedPath = await resolvedPath.json();
        parts[1] = resolvedPath.userid;
      }

      let res = await fetch("https://api.datahub.io/source/".concat(parts[1], "/").concat(name, "/successful"));

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
  // If it is a path to file we assume it is not a Dataset
  // Only exception is 'datapackage.json':
  if (path_.endsWith('datapackage.json')) {
    return true;
  }

  const isItUrl = isUrl(path_);

  if (isItUrl) {
    // If it is URL we assume it is a file as it does not end with 'datapackage.json'
    return false;
  } else if (fs.lstatSync(path_).isFile()) {
    return false;
  } // All other cases are true


  return true;
}; // ========================================================
// Dataset


class Dataset {
  // TODO: handle owner
  constructor() {
    let descriptor = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    let identifier = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {
      path: null,
      owner: null
    };

    if (!lodash.isPlainObject(descriptor)) {
      throw new TypeError("To create a new Dataset please use Dataset.load");
    }

    this._descriptor = descriptor;
    this._resources = [];
    this._identifier = identifier;
  } // eslint-disable-next-line no-unused-vars


  static async load(pathOrDescriptor) {
    let {
      owner = null
    } = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

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
      // pathOrDescriptor is a path
      descriptor = {}; // TODO: owner if provided should override anything parsed from path

      identifier = await parseDatasetIdentifier(pathOrDescriptor);
    }

    const dataset = new Dataset(descriptor, identifier);
    await dataset._sync();
    return dataset;
  } // Bootstrap ourselves with {this.path}/datapackage.json and readme if exists


  async _sync() {
    const readmePath = this._path('README.md'); // eslint-disable-next-line default-case


    switch (this.identifier.type) {
      case 'local':
        {
          if (fs.existsSync(this.dataPackageJsonPath)) {
            this._descriptor = JSON.parse(fs.readFileSync(this.dataPackageJsonPath));
            this._originalDescriptor = lodash.cloneDeep(this._descriptor);
          } else {
            throw new Error('No datapackage.json at destination.');
          } // Now get README from local disk if exists


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
            throw new Error("".concat(res.status, ": ").concat(res.statusText, ". Requested URL: ").concat(res.url));
          }

          this._descriptor = await res.json();
          this._originalDescriptor = lodash.cloneDeep(this._descriptor);

          if (!this._descriptor.readme) {
            res = await fetch(readmePath); // May not exist and that is ok!

            if (res.status === 200) {
              this._descriptor.readme = await res.text();
            }
          }

          break;
        }
    } // handle case where readme was already inlined in the descriptor as readme
    // attribute as e.g. on the datahub
    // Now load each resource ...


    this._resources = this.descriptor.resources.map(resource => {
      return open(resource, {
        basePath: this.path
      });
    }); // We need to update original descriptor with metadata about resources after guessing them

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
  } // Array of File objects


  get resources() {
    return this._resources;
  }

  addResource(resource) {
    if (lodash.isPlainObject(resource)) {
      this.descriptor.resources.push(resource);
      this.resources.push(open(resource));
    } else if (lodash.isObject(resource)) {
      // It is already a resource object!
      this.descriptor.resources.push(resource.descriptor);
      this.resources.push(resource);
    } else {
      throw new TypeError("addResource requires a resource descriptor or an instantiated resources but got: ".concat(resource));
    }
  } // Path relative to this dataset


  _path() {
    let offset = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    const path_ = this.path ? this.path.replace('datapackage.json', '') : this.path; // TODO: ensure offset is relative (security etc)

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
        throw new Error("Unknown path type: ".concat(this.identifier.type));
    }
  }

}

module.exports = {
  open,
  File,
  FileLocal,
  FileRemote,
  FileInline,
  parsePath,
  parseDatasetIdentifier,
  isUrl,
  isDataset,
  Dataset,
  xlsxParser,
  csvParser
};