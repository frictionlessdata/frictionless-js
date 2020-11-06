"use strict";

if (typeof window !== 'undefined') module.exports = { ...require('./utils')
};else module.exports = {
  isFileFromBrowser: file => {},
  webToNodeStream: reader => {}
};