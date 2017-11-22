const Readable = require('stream').Readable
const XLSX = require('xlsx')
const parse = require('csv-parse')

const {getParseOptions} = require('./csv')

const xlsxParser = async (file, keyed = false, sheetIdx = 0) => {
  const buffer = await file.buffer
  const workbook = XLSX.read(buffer, {type: 'buffer'})
  const selectedSheetName = workbook.SheetNames[sheetIdx]
  const sheet = workbook.Sheets[selectedSheetName]
  const csv = XLSX.utils.sheet_to_csv(sheet)
  const stream = new Readable()
  stream.push(csv)
  stream.push(null)
  const parseOptions = getParseOptions(file.descriptor.dialect, keyed)
  return stream.pipe(parse(parseOptions))
}

module.exports = {
  xlsxParser
}
