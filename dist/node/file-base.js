"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.computeHash = computeHash;
exports.File = void 0;

var _data = require("./data");

var _tableschema = require("tableschema");

var _streamToArray = _interopRequireDefault(require("stream-to-array"));

var _lodash = require("lodash");

var _csv = require("./parser/csv");

var _index = require("./browser-utils/index");

var _crypto = _interopRequireDefault(require("crypto"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const {
  Transform
} = require('stream');

class File {
  constructor(descriptor, {
    basePath
  } = {}) {
    this._descriptor = descriptor;
    this._basePath = basePath;
    this._descriptor.encoding = this.encoding || _data.DEFAULT_ENCODING;
    this._computedHashes = {};
  }

  static load(pathOrDescriptor, {
    basePath,
    format
  } = {}) {
    console.warn("WARNING! Depreciated function called. Function 'load' has been deprecated, please use the 'open' function instead!");
    return (0, _data.open)(pathOrDescriptor, {
      basePath,
      format
    });
  }

  get descriptor() {
    return this._descriptor;
  }

  get path() {
    throw new Error('This is an abstract base class which you should not instantiate. Use open() instead');
  }

  async bufferInChunks(getChunk) {
    let stream = null;

    if (this.displayName == 'FileInterface') {
      stream = (0, _index.webToNodeStream)(this.descriptor.stream());
    } else {
      stream = await this.stream();
    }

    let offset = 0;
    let totalChunkSize = 0;
    let chunkCount = 0;
    let fileSize = this.size;
    var percent = 0;

    const _reportProgress = new Transform({
      transform(chunk, encoding, callback) {
        if (chunkCount % 100 == 0) {
          const runningTotal = totalChunkSize + offset;
          const percentComplete = Math.round(runningTotal / fileSize * 100);
          percent = percentComplete;
        }

        callback(null, chunk);
      }

    });

    stream.pipe(_reportProgress).on('data', function (chunk) {
      offset += chunk.length;
      chunkCount += 1;
      let buffer = new Buffer.from(chunk);
      getChunk(buffer, percent);
    }).on('error', function (err) {
      throw new Error(err);
    });
  }

  get buffer() {
    return (async () => {
      const stream = await this.stream();
      const buffers = await (0, _streamToArray.default)(stream);
      return Buffer.concat(buffers);
    })();
  }

  async hash(hashType = 'md5', progress, cache = true) {
    if (cache && hashType in this._computedHashes) {
      if (typeof progress === 'function') {
        progress(100);
      }

      return this._computedHashes[hashType];
    } else {
      let hash = await computeHash(await this.stream(), this.size, hashType, progress);

      if (cache && this != null) {
        this._computedHashes[hashType] = hash;
      }

      return hash;
    }
  }

  async hashSha256(progress) {
    console.warn("WARNING! Depreciated function called. Function 'hashSha256' has been deprecated, use the 'hash' function and pass the algorithm type instead!");
    return this.hash('sha256', progress);
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
    if (this.descriptor.format in _data.PARSE_DATABASE) {
      const parser = _data.PARSE_DATABASE[this.descriptor.format];
      return parser(this, {
        keyed,
        sheet,
        size
      });
    }

    throw new Error(`We do not have a parser for that format: ${this.descriptor.format}`);
  }

  getSample() {
    return new Promise(async (resolve, reject) => {
      let smallStream = await this.rows({
        size: 100
      });
      resolve(await (0, _streamToArray.default)(smallStream));
    });
  }

  async addSchema() {
    if (this.displayName === 'FileInline') {
      this.descriptor.schema = await (0, _tableschema.infer)(this.descriptor.data);
      return;
    }

    let sample = await this.getSample();

    if (this.descriptor.format === 'xlsx' && sample) {
      let headers = 1;

      if ((0, _lodash.isPlainObject)(sample[0])) {
        headers = Object.keys(sample[0]);
      }

      this.descriptor.schema = await (0, _tableschema.infer)(sample, {
        headers
      });
      return;
    }

    if (_data.KNOWN_TABULAR_FORMAT.indexOf(this.descriptor.format) === -1) {
      throw new Error('File is not in known tabular format.');
    }

    const parserOptions = await (0, _csv.guessParseOptions)(this);
    this.descriptor.dialect = {
      delimiter: parserOptions.delimiter,
      quoteChar: parserOptions.quote
    };
    let thisFileStream = await this.stream({
      size: 100
    });
    this.descriptor.schema = await (0, _tableschema.infer)(thisFileStream, parserOptions);
  }

}

exports.File = File;

function computeHash(fileStream, fileSize, algorithm, progress, encoding = 'hex') {
  return new Promise((resolve, reject) => {
    let hash = _crypto.default.createHash(algorithm);

    let offset = 0;
    let totalChunkSize = 0;
    let chunkCount = 0;

    if (!['hex', 'latin1', 'binary', 'base64'].includes(encoding)) {
      throw new Error(`Invalid encoding value: ${encoding}; Expecting 'hex', 'latin1', 'binary' or 'base64'`);
    }

    const _reportProgress = new Transform({
      transform(chunk, encoding, callback) {
        if (chunkCount % 20 == 0) {
          const runningTotal = totalChunkSize + offset;
          const percentComplete = Math.round(runningTotal / fileSize * 100);

          if (typeof progress === 'function') {
            progress(percentComplete);
          }
        }

        callback(null, chunk);
      }

    });

    fileStream.pipe(_reportProgress).on('error', function (err) {
      reject(err);
    }).on('data', function (chunk) {
      offset += chunk.length;
      chunkCount += 1;
      hash.update(chunk);
    }).on('end', function () {
      hash = hash.digest(encoding);

      if (typeof progress === 'function') {
        progress(100);
      }

      resolve(hash);
    });
  });
}