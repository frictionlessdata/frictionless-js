"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "open", {
  enumerable: true,
  get: function () {
    return _data.open;
  }
});
Object.defineProperty(exports, "parsePath", {
  enumerable: true,
  get: function () {
    return _data.parsePath;
  }
});
Object.defineProperty(exports, "parseDatasetIdentifier", {
  enumerable: true,
  get: function () {
    return _data.parseDatasetIdentifier;
  }
});
Object.defineProperty(exports, "isDataset", {
  enumerable: true,
  get: function () {
    return _data.isDataset;
  }
});
Object.defineProperty(exports, "isUrl", {
  enumerable: true,
  get: function () {
    return _data.isUrl;
  }
});
Object.defineProperty(exports, "File", {
  enumerable: true,
  get: function () {
    return _fileBase.File;
  }
});
Object.defineProperty(exports, "computeHash", {
  enumerable: true,
  get: function () {
    return _fileBase.computeHash;
  }
});
Object.defineProperty(exports, "FileInterface", {
  enumerable: true,
  get: function () {
    return _fileInterface.FileInterface;
  }
});
Object.defineProperty(exports, "FileLocal", {
  enumerable: true,
  get: function () {
    return _fileLocal.FileLocal;
  }
});
Object.defineProperty(exports, "FileRemote", {
  enumerable: true,
  get: function () {
    return _fileRemote.FileRemote;
  }
});
Object.defineProperty(exports, "FileInline", {
  enumerable: true,
  get: function () {
    return _fileInline.FileInline;
  }
});
Object.defineProperty(exports, "Dataset", {
  enumerable: true,
  get: function () {
    return _dataset.Dataset;
  }
});
Object.defineProperty(exports, "csvParser", {
  enumerable: true,
  get: function () {
    return _csv.csvParser;
  }
});
Object.defineProperty(exports, "xlsxParser", {
  enumerable: true,
  get: function () {
    return _xlsx.xlsxParser;
  }
});

var _data = require("./data");

var _fileBase = require("./file-base");

var _fileInterface = require("./file-interface");

var _fileLocal = require("./file-local");

var _fileRemote = require("./file-remote");

var _fileInline = require("./file-inline");

var _dataset = require("./dataset");

var _csv = require("./parser/csv");

var _xlsx = require("./parser/xlsx");