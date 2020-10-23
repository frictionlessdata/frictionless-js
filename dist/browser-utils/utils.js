"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.toNodeStream = toNodeStream;
exports.isFileFromBrowser = isFileFromBrowser;
exports.readChunk = readChunk;

var _stream = require("stream");

async function toNodeStream(reader, size, returnChunk = false) {
  const nodeStream = new _stream.Readable();
  let lineCounter = 0;
  let lastString = '';
  let chunkText = '';
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
    chunkText += string;
    const lines = string.split(/\r\n|[\r\n]/g);
    lastString = lines.pop() || '';

    for (const line of lines) {
      if (lineCounter === size) {
        reader.cancel();
        break;
      }

      nodeStream.push(line + '\r\n');
      lineCounter++;
    }
  }

  nodeStream.push(null);

  if (returnChunk) {
    return chunkText;
  }

  return nodeStream;
}

function isFileFromBrowser(file) {
  return file instanceof File;
}

function readChunk(file, next, done) {
  let fileSize = file.size;
  let chunkSize = 4 * 1024 * 1024;
  let offset = 0;
  let reader = new FileReader();

  reader.onload = function () {
    if (reader.error) {
      done(reader.error || {});
      return;
    }

    offset += reader.result.length;
    next(reader.result, offset, fileSize);

    if (offset >= fileSize) {
      done(null);
      return;
    }

    readNext();
  };

  reader.onerror = function (err) {
    done(err || {});
  };

  function readNext() {
    let fileSlice = file.slice(offset, offset + chunkSize);
    reader.readAsBinaryString(fileSlice);
  }

  readNext();
}