"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.FileRemote = void 0;

var _urlJoin = _interopRequireDefault(require("url-join"));

var _nodeFetch = _interopRequireDefault(require("node-fetch"));

var _fileBase = require("./file-base");

var _data = require("./data");

var _index = require("./browser-utils/index");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class FileRemote extends _fileBase.File {
  get displayName() {
    return 'FileRemote';
  }

  get path() {
    const isItUrl = (0, _data.isUrl)(this.descriptor.path);

    if (isItUrl) {
      return this.descriptor.path;
    } else {
      return this._basePath ? (0, _urlJoin.default)(this._basePath, this.descriptor.path) : this.descriptor.path;
    }
  }

  get browserBuffer() {
    return (async () => {
      const res = await (0, _nodeFetch.default)(this.path);
      return await res.arrayBuffer();
    })();
  }

  stream({
    size
  } = {}) {
    return (async () => {
      const res = await (0, _nodeFetch.default)(this.path);

      if (res.status === 200) {
        if (typeof window === 'undefined') {
          return res.body;
        } else {
          return (0, _index.webToNodeStream)(res.body, size);
        }
      } else {
        throw new Error(`${res.status}: ${res.statusText}. Requested URL: ${this.path}`);
      }
    })();
  }

  get encoding() {
    return this._encoding || _data.DEFAULT_ENCODING;
  }

}

exports.FileRemote = FileRemote;