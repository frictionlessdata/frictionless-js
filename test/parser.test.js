const test = require('ava')
const toArray = require('stream-to-array')

const {xlsxParser} = require('../lib/parser/xlsx')
const {File} = require('../lib/index')

test('xlsxParser works with XLSX files', async t => {
  const path_ = 'test/fixtures/sample.xlsx'
  const file = await File.load(path_)
  const rows = await toArray(await xlsxParser(file))
  t.deepEqual(rows[0], ['number', 'string', 'boolean'])
})

test('xlsxParser works with XLS files', async t => {
  const path_ = 'test/fixtures/sample.xls'
  const file = await File.load(path_)
  const rows = await toArray(await xlsxParser(file))
  t.deepEqual(rows[0], ['number', 'string', 'boolean'])
})

test('xlsxParser works with keyed option', async t => {
  const path_ = 'test/fixtures/sample.xls'
  const file = await File.load(path_)
  const keyed = true
  const rows = await toArray(await xlsxParser(file, keyed))
  t.deepEqual(rows[0], {number: '1', string: 'two', boolean: 'TRUE'})
})

test('xlsxParser works with semicolon delimeter', async t => {
  const path_ = 'test/fixtures/semicolon-delimited.csv'
  const file = await File.load(path_)
  file.descriptor.dialect = {
    delimiter: ';'
  }
  const rows = await toArray(await xlsxParser(file))
  t.deepEqual(rows[0], ['id', 'name'])
  t.deepEqual(rows[1], ['1', 'John'])
})

test('xlsxParser works with specified sheet index', async t => {
  const path_ = 'test/fixtures/sample-multi-sheet.xlsx'
  const file = await File.load(path_)
  let sheetIdx = 0
  let rows = await toArray(await xlsxParser(file, false, sheetIdx))
  t.deepEqual(rows[0], ['a', 'b', 'c'])
  sheetIdx = 1
  rows = await toArray(await xlsxParser(file, false, sheetIdx))
  t.deepEqual(rows[0], ['d', 'e', 'f'])
})
