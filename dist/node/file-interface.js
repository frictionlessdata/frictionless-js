"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.FileInterface = void 0;

var _data = require("./data");

var _index = require("./browser-utils/index");

var _fileBase = require("./file-base");

class FileInterface extends _fileBase.File {
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

  async stream({
    size
  } = {}) {
    return (0, _index.webToNodeStream)(await this.descriptor.stream(), size);
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

}

exports.FileInterface = FileInterface;