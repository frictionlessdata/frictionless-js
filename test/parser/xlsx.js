import assert from 'assert'
import toArray from 'stream-to-array'
import { xlsxParser } from '../../src/parser/xlsx'
import * as data from '../../src/index'

describe('xlsxParser', function () {
  it('xlsxParser works with local XLSX files', async () => {
    const path_ = 'test/fixtures/sample.xlsx'
    const file = await data.open(path_)
    const rows = await toArray(await xlsxParser(file))
    assert.deepStrictEqual(rows[0], ['number', 'string', 'boolean'])
  })

  it('xlsxParser works with keyed option', async () => {
    const path_ = 'test/fixtures/sample.xls'
    const file = await data.open(path_)
    const keyed = true
    const rows = await toArray(await xlsxParser(file, keyed))
    assert.deepStrictEqual(rows[0], {
      number: '1',
      string: 'two',
      boolean: 'TRUE',
    })
  })

  it('xlsxParser works with specified sheet index', async () => {
    const path_ = 'test/fixtures/sample-multi-sheet.xlsx'
    const file = await data.open(path_)
    let sheetIdx = 0
    let rows = await toArray(await xlsxParser(file, false, sheetIdx))
    assert.deepStrictEqual(rows[0], ['a', 'b', 'c'])

    sheetIdx = 1
    rows = await toArray(await xlsxParser(file, false, sheetIdx))
    assert.deepStrictEqual(rows[0], ['d', 'e', 'f'])
  })

  it('xlsxParser works with specified sheet name', async () => {
    const path_ = 'test/fixtures/sample-multi-sheet.xlsx'
    const file = await data.open(path_)
    let sheetName = 'Sheet1'
    let rows = await toArray(await xlsxParser(file, false, sheetName))
    assert.deepStrictEqual(rows[0], ['a', 'b', 'c'])

    sheetName = 'Sheet2'
    rows = await toArray(await xlsxParser(file, false, sheetName))
    assert.deepStrictEqual(rows[0], ['d', 'e', 'f'])
  })
})
