import { Readable } from 'stream'
import { read, utils } from 'xlsx'
import parse from 'csv-parse'

export async function xlsxParser(file, keyed = false, sheetIdxOrName = 0) {
  let buffer

  if (typeof window === 'undefined' || file.displayName === 'FileInterface') {
    buffer = await file.buffer
  } else {
    // Running in browser
    buffer = await file.browserBuffer
  }

  const workbook = read(buffer, { type: 'buffer' })
  let selectedSheetName = sheetIdxOrName

  if (sheetIdxOrName.constructor.name === 'Number') {
    selectedSheetName = workbook.SheetNames[sheetIdxOrName]
  }

  const sheet = workbook.Sheets[selectedSheetName]
  const csv = utils.sheet_to_csv(sheet)
  const stream = new Readable()

  stream.push(csv)
  stream.push(null)
  
  return stream.pipe(
    parse({
      columns: keyed ? true : null,
      ltrim: true,
    })
  )
}
