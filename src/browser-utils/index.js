if (typeof window !== 'undefined') module.exports = { ...require('./utils') }
else
  module.exports = {
    toNodeStream: (res, size) => {},
    checkFileFromBrowser: (file) => {},
  }
