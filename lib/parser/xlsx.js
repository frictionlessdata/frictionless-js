const Readable = require('stream').Readable
const XLSX = require('xlsx')
const parse = require('csv-parse')

const {getParseOptions} = require('./csv')

const xlsxParser = async (resource, keyed = false) => {
  const buffer = await resource.buffer
  const workbook = XLSX.read(buffer, {type: 'buffer'})
  // For now we handle only first sheet
  const firstSheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[firstSheetName]
  const csv = XLSX.utils.sheet_to_csv(sheet)
  const stream = new Readable()
  stream.push(csv)
  stream.push(null)
  const parseOptions = getParseOptions(resource.descriptor.dialect, keyed)
  return stream.pipe(parse(parseOptions))
}

module.exports = {
  xlsxParser
}
