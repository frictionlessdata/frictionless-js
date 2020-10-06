"use strict";

if (typeof window !== 'undefined') module.exports = { ...require('./utils')
};else module.exports = {
  toNodeStream: (reader, size) => {},
  isFileFromBrowser: file => {}
};