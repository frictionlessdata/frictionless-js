"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.webToNodeStream = webToNodeStream;
exports.isFileFromBrowser = isFileFromBrowser;

var _stream = require("stream");

var _readableWebToNodeStream = require("readable-web-to-node-stream");

async function webToNodeStream(stream, size, returnChunk = false) {
  if (size == undefined || size == -1) {
    return new _readableWebToNodeStream.ReadableWebToNodeStream(stream);
  } else {
    const nodeStream = new _stream.Readable({
      read: {}
    });
    let lineCounter = 0;
    let lastString = '';
    let chunkText = '';
    const decoder = new TextDecoder();
    let reader = stream.getReader();

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
}

function isFileFromBrowser(file) {
  return file instanceof File;
}