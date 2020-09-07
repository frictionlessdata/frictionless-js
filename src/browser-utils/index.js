if (typeof window !== 'undefined') module.exports = { ...require('./api') }
else
  module.exports = {
    toNodeStream: (res, size) => {},
  }
