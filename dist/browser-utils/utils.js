"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.toNodeStream = toNodeStream;
exports.isFileFromBrowser = isFileFromBrowser;
exports.readChunked = readChunked;

var _stream = require("stream");

async function toNodeStream(reader, size) {
  const nodeStream = new _stream.Readable();
  let lineCounter = 0;
  let lastString = '';
  const decoder = new TextDecoder();

  while (true) {
    const {
      done,
      value
    } = await reader.read();

    if (done || lineCounter > size && size !== 0) {
      reader.cancel();
      break;
    }

    const string = `${lastString}${decoder.decode(value)}`;
    const lines = string.split(/\r\n|[\r\n]/g);
    lastString = lines.pop() || '';

    for (const line of lines) {
      if (lineCounter === size) break;
      nodeStream.push(line + '\r\n');
      lineCounter++;
    }
  }

  nodeStream.push(null);
  return nodeStream;
}

function isFileFromBrowser(file) {
  return file instanceof File;
}

function readChunked(file, chunkCallback, endCallback) {
  let fileSize = file.size;
  let chunkSize = 4 * 1024 * 1024;
  let offset = 0;
  let reader = new FileReader();

  reader.onload = function () {
    if (reader.error) {
      endCallback(reader.error || {});
      return;
    }

    offset += reader.result.length;
    chunkCallback(reader.result, offset, fileSize);

    if (offset >= fileSize) {
      endCallback(null);
      return;
    }

    readNext();
  };

  reader.onerror = function (err) {
    endCallback(err || {});
  };

  function readNext() {
    let fileSlice = file.slice(offset, offset + chunkSize);
    reader.readAsBinaryString(fileSlice);
  }

  readNext();
}