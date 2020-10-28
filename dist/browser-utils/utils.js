"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.toNodeStream = toNodeStream;
exports.isFileFromBrowser = isFileFromBrowser;
exports.webToNodeStream = webToNodeStream;

var _stream = require("stream");

var _readableWebToNodeStream = require("readable-web-to-node-stream");

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

function webToNodeStream(reader) {
  const stream = new _readableWebToNodeStream.ReadableWebToNodeStream(reader);
  return stream;
}