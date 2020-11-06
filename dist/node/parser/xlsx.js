"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.xlsxParser = xlsxParser;

var _stream = require("stream");

var _xlsx = require("xlsx");

var _csvParse = _interopRequireDefault(require("csv-parse"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

async function xlsxParser(file, keyed = false, sheetIdxOrName = 0) {
  let buffer;

  if (typeof window === 'undefined' || file.displayName === 'FileInterface') {
    buffer = await file.buffer;
  } else {
    buffer = await file.browserBuffer;
  }

  const workbook = (0, _xlsx.read)(buffer, {
    type: 'buffer'
  });
  let selectedSheetName = sheetIdxOrName;

  if (sheetIdxOrName.constructor.name === 'Number') {
    selectedSheetName = workbook.SheetNames[sheetIdxOrName];
  }

  const sheet = workbook.Sheets[selectedSheetName];

  const csv = _xlsx.utils.sheet_to_csv(sheet);

  const stream = new _stream.Readable();
  stream.push(csv);
  stream.push(null);
  return stream.pipe((0, _csvParse.default)({
    columns: keyed ? true : null,
    ltrim: true
  }));
}