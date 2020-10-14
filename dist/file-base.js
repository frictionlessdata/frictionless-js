"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.FileInterface = exports.File = void 0;

var _data = require("./data");

var _tableschema = require("tableschema");

var _streamToArray = _interopRequireDefault(require("stream-to-array"));

var _lodash = require("lodash");

var _csv = require("./parser/csv");

var _index = require("./browser-utils/index");

var _crypto = _interopRequireDefault(require("crypto"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class File {
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

  constructor(descriptor, {
    basePath
  } = {}) {
    this._descriptor = descriptor;
    this._basePath = basePath;
    this._descriptor.encoding = this.encoding || _data.DEFAULT_ENCODING;
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
      const buffers = await (0, _streamToArray.default)(stream);
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

  async addSchema() {
    if (this.displayName === 'FileInline') {
      this.descriptor.schema = await (0, _tableschema.infer)(this.descriptor.data);
      return;
    }

    if (this.descriptor.format === 'xlsx' && this.descriptor.sample) {
      let headers = 1;

      if ((0, _lodash.isPlainObject)(this.descriptor.sample[0])) {
        headers = Object.keys(this.descriptor.sample[0]);
      }

      this.descriptor.schema = await (0, _tableschema.infer)(this.descriptor.sample, {
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
    return this._encoding || _data.DEFAULT_ENCODING;
  }

  stream({
    size
  } = {}) {
    size = size === -1 ? this.size : size || 0;
    return (0, _index.toNodeStream)(this.descriptor.stream().getReader(), size);
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

  async generateHash(hashType, cbProgress) {
    return new Promise((resolve, reject) => {
      let newHash = hashType === "md5" ? _crypto.default.createHash('md5') : _crypto.default.createHash('sha256');
      (0, _index.readChunked)(this.descriptor, (chunk, offs, total) => {
        newHash.update(chunk);

        if (cbProgress) {
          cbProgress(offs / total);
        }
      }, err => {
        if (err) {
          reject(err);
        } else {
          let hashHex = newHash.digest('hex');
          resolve(hashHex);
        }
      });
    });
  }

  async hash(cbProgress) {
    return this.generateHash("md5", cbProgress);
  }

  async hashSha256(cbProgress) {
    return this.generateHash("sha256", cbProgress);
  }

}

exports.FileInterface = FileInterface;