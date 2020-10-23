"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.csvParser = csvParser;
exports.guessParseOptions = guessParseOptions;
exports.getParseOptions = getParseOptions;
exports.Uint8ArrayToStringsTransformer = void 0;

var _csvParse = _interopRequireDefault(require("csv-parse"));

var _streamToString = _interopRequireDefault(require("stream-to-string"));

var _iconvLite = require("iconv-lite");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const CSVSniffer = require('csv-sniffer')();

async function csvParser(file, {
  keyed = false,
  size = 0
} = {}) {
  const parseOptions = await getParseOptions(file, keyed);
  let stream = await file.stream({
    size
  });

  if (file.descriptor.encoding.toLowerCase().replace('-', '') === 'utf8') {
    return stream.pipe((0, _csvParse.default)(parseOptions));
  } else {
    return stream.pipe((0, _iconvLite.decodeStream)(file.descriptor.encoding)).pipe((0, _csvParse.default)(parseOptions));
  }
}

async function guessParseOptions(file) {
  const possibleDelimiters = [',', ';', ':', '|', '\t', '^', '*', '&'];
  const sniffer = new CSVSniffer(possibleDelimiters);
  let text = '';

  if (file.displayName === 'FileLocal') {
    const stream = await file.stream({
      end: 50000
    });
    text = await (0, _streamToString.default)(stream);
  } else if (file.displayName === 'FileInterface') {
    text = await getChunkText(file);
  } else if (file.displayName === 'FileRemote') {
    const stream = await file.stream({
      size: 100
    });
    let bytes = 0;
    await new Promise((resolve, reject) => {
      stream.on('data', chunk => {
        bytes += chunk.length;

        if (bytes > 50000) {
          stream.pause();
          resolve();
        } else {
          text += chunk.toString();
        }
      }).on('end', () => {
        resolve();
      });
    });
  }

  const results = sniffer.sniff(text);
  return {
    delimiter: results.delimiter,
    quote: results.quoteChar || '"'
  };
}

async function getParseOptions(file, keyed) {
  let parseOptions = {
    columns: keyed ? true : null,
    ltrim: true
  };

  if (file.descriptor.dialect) {
    parseOptions.delimiter = file.descriptor.dialect.delimiter || ',';
    parseOptions.rowDelimiter = file.descriptor.dialect.lineTerminator;
    parseOptions.quote = file.descriptor.dialect.quoteChar || '"';

    if (file.descriptor.dialect.doubleQuote !== undefined && file.descriptor.dialect.doubleQuote === false) {
      parseOptions.escape = '';
    }
  } else {
    const guessedParseOptions = await guessParseOptions(file);
    parseOptions = Object.assign(parseOptions, guessedParseOptions);
  }

  return parseOptions;
}

class Uint8ArrayToStringsTransformer {
  constructor() {
    this.decoder = new TextDecoder();
    this.lastString = '';
  }

  transform(chunk, controller) {
    const string = `${this.lastString}${this.decoder.decode(chunk)}`;
    const lines = string.split(/\r\n|[\r\n]/g);
    this.lastString = lines.pop() || '';

    for (const line of lines) {
      controller.enqueue(line);
    }
  }

  flush(controller) {
    if (this.lastString) {
      controller.enqueue(this.lastString);
    }
  }

}

exports.Uint8ArrayToStringsTransformer = Uint8ArrayToStringsTransformer;

async function getChunkText(file, size = 10) {
  let chunkText = '';
  const reader = file.descriptor.stream().getReader();
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
    chunkText += string;
    const lines = string.split(/\r\n|[\r\n]/g);
    lastString = lines.pop() || '';

    for (const line of lines) {
      if (lineCounter === size) {
        reader.cancel();
        break;
      }

      lineCounter++;
    }
  }

  return chunkText;
}