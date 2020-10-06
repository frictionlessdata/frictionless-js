"use strict";

require("core-js/modules/es.object.assign");

require("core-js/modules/es.promise");

require("core-js/modules/es.regexp.to-string");

require("core-js/modules/es.string.replace");

require("core-js/modules/es.string.split");

require("core-js/modules/web.dom-collections.iterator");

const parse = require('csv-parse');

const CSVSniffer = require('csv-sniffer')();

const toString = require('stream-to-string');

const iconv = require('iconv-lite');

const csvParser = async function csvParser(file) {
  let {
    keyed = false,
    size = 0
  } = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  const parseOptions = await getParseOptions(file, keyed);
  let stream = await file.stream({
    size
  });

  if (file.descriptor.encoding.toLowerCase().replace('-', '') === 'utf8') {
    return stream.pipe(parse(parseOptions));
  } else {
    return stream.pipe(iconv.decodeStream(file.descriptor.encoding)).pipe(parse(parseOptions));
  }
};

const guessParseOptions = async file => {
  const possibleDelimiters = [',', ';', ':', '|', '\t', '^', '*', '&'];
  const sniffer = new CSVSniffer(possibleDelimiters);
  let text = '';

  if (file.displayName === 'FileLocal') {
    const stream = await file.stream({
      end: 50000
    });
    text = await toString(stream);
  } else if (file.displayName === 'FileInterface') {
    text = await file.descriptor.text();
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
};

const getParseOptions = async (file, keyed) => {
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
};

class Uint8ArrayToStringsTransformer {
  constructor() {
    this.decoder = new TextDecoder();
    this.lastString = '';
  }

  transform(chunk, controller) {
    const string = "".concat(this.lastString).concat(this.decoder.decode(chunk));
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

module.exports = {
  csvParser,
  getParseOptions,
  guessParseOptions,
  Uint8ArrayToStringsTransformer
};