const parse = require('csv-parse')
const CSVSniffer = require("csv-sniffer")()
const toString = require('stream-to-string')
const iconv = require('iconv-lite')

const csvParser = async (file, keyed = false) => {
  const parseOptions = await getParseOptions(file, keyed)
  const stream = await file.stream()
  if (file.descriptor.encoding.toLowerCase().replace('-', '') === 'utf8') {
    return stream.pipe(parse(parseOptions))
  } else { // non utf-8 files are decoded by iconv-lite module
    return stream.pipe(iconv.decodeStream(file.descriptor.encoding)).pipe(parse(parseOptions))
  }
}

const guessParseOptions = async (file) => {
  const possibleDelimiters = [',', ';', ':', '|', '\t', '^', '*', '&']
  const sniffer = new CSVSniffer(possibleDelimiters)
  let text = ''
  // We assume that reading first 1M bytes is enough to detect delimiter, line terminator etc.:
  if (file.descriptor.pathType === 'local') {
    const stream = await file.stream({end: 1000000})
    text = await toString(stream)
  } else if (file.descriptor.pathType === 'remote') {
    const stream = await file.stream()
    let bytes = 0
    await new Promise((resolve, reject) => {
      stream
        .on('data', (chunk) => {
          bytes += chunk.length
          if (bytes > 1000000) {
            stream.pause()
            resolve()
          } else {
            text += chunk.toString()
          }
        })
        .on('end', () => {
          resolve()
        })
    })
  }
  const results = sniffer.sniff(text)
  return {
    delimiter: results.delimiter,
    quote: results.quoteChar || '"'
  }
}

const getParseOptions = async (file, keyed) => {
  let parseOptions = {
    columns: keyed ? true : null,
    ltrim: true
  }
  if (file.descriptor.dialect) {
    parseOptions.delimiter = file.descriptor.dialect.delimiter || ','
    parseOptions.rowDelimiter = file.descriptor.dialect.lineTerminator
    parseOptions.quote = file.descriptor.dialect.quoteChar || '"'
    if (file.descriptor.dialect.doubleQuote !== undefined && dialect.doubleQuote === false) {
      parseOptions.escape = ''
    }
  } else {
    const guessedParseOptions = await guessParseOptions(file)
    // Merge guessed parse options with default one:
    parseOptions = Object.assign(parseOptions, guessedParseOptions)
  }

  return parseOptions
}

module.exports = {
  csvParser,
  getParseOptions,
  guessParseOptions
}
