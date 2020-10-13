"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.toNodeStream = toNodeStream;
exports.isFileFromBrowser = isFileFromBrowser;

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