if (typeof window !== 'undefined') module.exports = { ...require('./utils') }
else
  module.exports = {
    toNodeStream: (res, size) => {},
    isFileFromBrowser: (file) => {},
    readCSV: (file) => {},
    readChunked: (file, chunkCallback, endCallback) => {},
  }
