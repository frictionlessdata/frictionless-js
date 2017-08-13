const parse = require('csv-parse')

const csvParser = async (file, keyed = false) => {
  const stream = await file.stream()
  const parseOptions = getParseOptions(file.descriptor.dialect, keyed)
  return stream.pipe(parse(parseOptions))
}

const getParseOptions = (dialect, keyed) => {
  const parseOptions = {
    columns: keyed ? true : null,
    ltrim: true
  }
  if (dialect) {
    parseOptions.delimiter = dialect.delimiter || ','
    parseOptions.rowDelimiter = dialect.lineTerminator
    parseOptions.quote = dialect.quoteChar || '"'
    if (dialect.doubleQuote !== undefined && dialect.doubleQuote === false) {
      parseOptions.escape = ''
    }
  }

  return parseOptions
}

module.exports = {
  csvParser,
  getParseOptions
}
