"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.FileInline = void 0;

var _stream = _interopRequireDefault(require("stream"));

var _fileBase = require("./file-base");

var _lodash = require("lodash");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class FileInline extends _fileBase.File {
  constructor(descriptor, {
    basePath
  } = {}) {
    super(descriptor, {
      basePath
    });

    if ((0, _lodash.isString)(this.descriptor.data)) {
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

  stream() {
    const bufferStream = new _stream.default.PassThrough();
    bufferStream.end(this._buffer);
    return bufferStream;
  }

  rows({
    keyed
  } = {}) {
    if ((0, _lodash.isArray)(this.descriptor.data)) {
      const rowStream = new _stream.default.PassThrough({
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

exports.FileInline = FileInline;