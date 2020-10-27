"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.toNodeStream = toNodeStream;
exports.isFileFromBrowser = isFileFromBrowser;
exports.webToNodeStream = webToNodeStream;
exports.computeHash = computeHash;

var _stream = require("stream");

var _readableWebToNodeStream = require("readable-web-to-node-stream");

var _crypto = _interopRequireDefault(require("crypto"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const {
  Transform
} = require('stream');

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

function computeHash(fileStream, fileSize, algorithm) {
  return new Promise((resolve, reject) => {
    let hash = _crypto.default.createHash(algorithm);

    let offset = 0;
    let totalChunkSize = 0;
    let chunkCount = 0;

    const _reportProgress = new Transform({
      transform(chunk, encoding, callback) {
        if (chunkCount % 20 == 0) {
          const runningTotal = totalChunkSize + offset;
          const percentComplete = Math.round(runningTotal / fileSize * 100);
          console.log(`Hashing progress: ...${percentComplete}%`);
        }

        callback(null, chunk);
      }

    });

    fileStream.pipe(_reportProgress).on('error', function (err) {
      reject(err);
    }).on('data', function (chunk) {
      offset += chunk.length;
      chunkCount += 1;
      hash.update(chunk);
    }).on('end', function () {
      hash = hash.digest('hex');
      console.log(`Hashing progress: ...100%`);
      resolve(hash);
    });
  });
}