"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.open = open;
exports.isDataset = exports.isUrl = exports.parseDatasetIdentifier = exports.parsePath = exports.KNOWN_TABULAR_FORMAT = exports.PARSE_DATABASE = exports.DEFAULT_ENCODING = void 0;

var _fs = _interopRequireDefault(require("fs"));

var _path = _interopRequireDefault(require("path"));

var _url = _interopRequireDefault(require("url"));

var _nodeFetch = _interopRequireDefault(require("node-fetch"));

var _lodash = require("lodash");

var _mimeTypes = _interopRequireDefault(require("mime-types"));

var _csv = require("./parser/csv");

var _xlsx = require("./parser/xlsx");

var _index = require("./browser-utils/index");

var _fileInterface = require("./file-interface");

var _fileLocal = require("./file-local");

var _fileRemote = require("./file-remote");

var _fileInline = require("./file-inline");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const DEFAULT_ENCODING = 'utf-8';
exports.DEFAULT_ENCODING = DEFAULT_ENCODING;
const PARSE_DATABASE = {
  csv: _csv.csvParser,
  tsv: _csv.csvParser,
  xlsx: _xlsx.xlsxParser,
  xls: _xlsx.xlsxParser
};
exports.PARSE_DATABASE = PARSE_DATABASE;
const KNOWN_TABULAR_FORMAT = ['csv', 'tsv', 'dsv'];
exports.KNOWN_TABULAR_FORMAT = KNOWN_TABULAR_FORMAT;

function open(pathOrDescriptor, {
  basePath,
  format
} = {}) {
  let descriptor = null;

  if ((0, _index.isFileFromBrowser)(pathOrDescriptor)) {
    return new _fileInterface.FileInterface(pathOrDescriptor);
  }

  if ((0, _lodash.isPlainObject)(pathOrDescriptor)) {
    descriptor = (0, _lodash.cloneDeep)(pathOrDescriptor);

    if (descriptor.data) {
      return new _fileInline.FileInline(descriptor, {
        basePath
      });
    } else if (descriptor.path) {
      descriptor = Object.assign(parsePath(descriptor.path, basePath), descriptor);
    }
  } else if ((0, _lodash.isString)(pathOrDescriptor)) {
    descriptor = parsePath(pathOrDescriptor, basePath, format);
  } else {
    throw new TypeError(`Cannot create File from ${pathOrDescriptor}`);
  }

  const isRemote = descriptor.pathType === 'remote' || isUrl(basePath);

  if (isRemote) {
    return new _fileRemote.FileRemote(descriptor, {
      basePath
    });
  }

  return new _fileLocal.FileLocal(descriptor, {
    basePath
  });
}

const parsePath = (path_, basePath = null, format = null) => {
  let fileName;
  const isItUrl = isUrl(path_) || isUrl(basePath);

  if (isItUrl) {
    const urlParts = _url.default.parse(path_);

    fileName = urlParts.pathname.replace(/^.*[\\\/]/, '');

    if (!format && urlParts.query && urlParts.query.includes('format=csv')) {
      format = 'csv';
    }
  } else {
    fileName = path_.replace(/^.*[\\\/]/, '');
  }

  const extension = _path.default.extname(fileName);

  fileName = fileName.replace(extension, '').toLowerCase().trim().replace(/&/g, '-and-').replace(/[^a-z0-9-._]+/g, '-');
  const descriptor = {
    path: path_,
    pathType: isItUrl ? 'remote' : 'local',
    name: fileName,
    format: format ? format : extension.slice(1).toLowerCase()
  };

  const mediatype = _mimeTypes.default.lookup(path_);

  if (mediatype) {
    descriptor.mediatype = mediatype;
  }

  return descriptor;
};

exports.parsePath = parsePath;

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
      out.path = _path.default.resolve(normalizedPath);
    } else {
      out.path = _path.default.posix.resolve(normalizedPath);
    }

    out.name = _path.default.basename(out.path);
  } else if (out.type === 'url') {
    const urlparts = _url.default.parse(normalizedPath);

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
        let resolvedPath = await (0, _nodeFetch.default)(`https://api.datahub.io/resolver/resolve?path=${owner}/${name}`);
        resolvedPath = await resolvedPath.json();
        parts[1] = resolvedPath.userid;
      }

      let res = await (0, _nodeFetch.default)(`https://api.datahub.io/source/${parts[1]}/${name}/successful`);

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
    out.path = _url.default.format(urlparts) + '/';
  }

  return out;
};

exports.parseDatasetIdentifier = parseDatasetIdentifier;

const isUrl = path_ => {
  const r = new RegExp('^(?:[a-z]+:)?//', 'i');
  return r.test(path_);
};

exports.isUrl = isUrl;

const isDataset = path_ => {
  if (path_.endsWith('datapackage.json')) {
    return true;
  }

  const isItUrl = isUrl(path_);

  if (isItUrl) {
    return false;
  } else if (_fs.default.lstatSync(path_).isFile()) {
    return false;
  }

  return true;
};

exports.isDataset = isDataset;