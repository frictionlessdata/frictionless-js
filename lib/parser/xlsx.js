const Readable = require('stream').Readable
const XLSX = require('xlsx')
const parse = require('csv-parse')
const inquirer = require('inquirer')

const {getParseOptions} = require('./csv')

const xlsxParser = async (file, keyed = false, sheetIdx) => {
  const buffer = await file.buffer
  const workbook = XLSX.read(buffer, {type: 'buffer'})
  let selectedSheetName
  // Check if sheetIdx is provided or equal to 0; then check if it is a number
  if ((sheetIdx || sheetIdx === 0) && !isNaN(sheetIdx)) {
    selectedSheetName = workbook.SheetNames[sheetIdx]
  } else {
    selectedSheetName = workbook.SheetNames[0]
    if (workbook.SheetNames.length > 1) {
      const answer = await inquirer.prompt([{
        type: 'list',
        name: 'sheetName',
        message: 'Please, select a sheet from your Excel file:',
        choices: workbook.SheetNames
      }])
      selectedSheetName = answer.sheetName
    }
  }
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
