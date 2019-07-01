const Readable = require('stream').Readable
const XLSX = require('xlsx')
const parse = require('csv-parse')

const {getParseOptions} = require('./csv')

const xlsxParser = async (file, keyed = false, sheetIdxOrName = 0) => {
  let buffer
  if (typeof window === 'undefined') {
    // Not in browser so 'buffer' is available
    buffer = await file.buffer
  } else {
    // Running in browser
    buffer = await file.browserBuffer
  }
  const workbook = XLSX.read(buffer, {type: 'buffer'})
  let selectedSheetName = sheetIdxOrName
  if (sheetIdxOrName.constructor.name === 'Number') {
    selectedSheetName = workbook.SheetNames[sheetIdxOrName]
  }
  const sheet = workbook.Sheets[selectedSheetName]
  const csv = XLSX.utils.sheet_to_csv(sheet)
  const stream = new Readable()
  stream.push(csv)
  stream.push(null)
  return stream.pipe(parse({
    columns: keyed ? true : null,
    ltrim: true
  }))
}

module.exports = {
  xlsxParser
}
