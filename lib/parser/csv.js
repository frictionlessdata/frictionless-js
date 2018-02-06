const parse = require('csv-parse')
const CSVSniffer = require("csv-sniffer")()
const toString = require('stream-to-string')

const csvParser = async (file, keyed = false) => {
  const parseOptions = await getParseOptions(file, keyed)
  const stream = await file.stream()
  return stream.pipe(parse(parseOptions))
}

const guessParseOptions = async (file) => {
  const possibleDelimiters = [',', ';', ':', '|', '\t', '^', '*', '&']
  const sniffer = new CSVSniffer(possibleDelimiters)
  const stream = await file.stream()
  const text = await toString(stream)
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
