"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.FileLocal = void 0;

var _chardet = _interopRequireDefault(require("chardet"));

var _fs = _interopRequireDefault(require("fs"));

var _fileBase = require("./file-base");

var _path = _interopRequireDefault(require("path"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class FileLocal extends _fileBase.File {
  get displayName() {
    return 'FileLocal';
  }

  get path() {
    return this._basePath ? _path.default.join(this._basePath, this.descriptor.path) : this.descriptor.path;
  }

  stream({
    size
  } = {}) {
    let end = size;
    return _fs.default.createReadStream(this.path, {
      start: 0,
      end
    });
  }

  get size() {
    return _fs.default.statSync(this.path).size;
  }

  get encoding() {
    if (this.size > 1000000) {
      return _chardet.default.detectFileSync(this.path, {
        sampleSize: 1000000
      });
    }

    return _chardet.default.detectFileSync(this.path);
  }

}

exports.FileLocal = FileLocal;