if (typeof window !== 'undefined') module.exports = { ...require('./utils') }
else
  module.exports = {
    toNodeStream: (reader, size, returnChunk) => {},
    isFileFromBrowser: (file) => {},
    getStream: (reader) => {},
    computeHash: (fileStream, fileSize, algorithm) => {}
  }
