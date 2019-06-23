const test = require('ava')
const toArray = require('stream-to-array')

const {xlsxParser} = require('../src/parser/xlsx')
const {csvParser, guessParseOptions} = require('../src/parser/csv')
const data = require('../src/index')

test('xlsxParser works with XLSX files', async t => {
  const path_ = 'test/fixtures/sample.xlsx'
  const file = await data.open(path_)
  const rows = await toArray(await xlsxParser(file))
  t.deepEqual(rows[0], ['number', 'string', 'boolean'])
})

test('csvParser iso8859 file encoding', async t => {
  const path_ = 'test/fixtures/encodings/iso8859.csv'
  const file = await data.open(path_)
  const rows = await toArray(await csvParser(file))
  t.deepEqual(rows[1], ['Réunion','ECS','1989','838462813'])
})

test.failing('csvParser western-macos-roman file encoding', async t => {
  const path_ = 'test/fixtures/encodings/western-macos-roman.csv'
  const file = await data.open(path_)
  const rows = await toArray(await csvParser(file))
  t.deepEqual(rows[1], ['Réunion','ECS','1989','838462813'])
})

// this test works well, but is switched off, coz we froze remote encoding function.
test.failing('csvParser iso8859 remote file encoding', async t => {
  const url = 'https://raw.githubusercontent.com/frictionlessdata/test-data/master/files/csv/encodings/iso8859.csv'
  const file = await data.open(url)
  const rows = await toArray(await csvParser(file))
  t.deepEqual(rows[1], ['Réunion','ECS','1989','838462813'])
})

test.failing('csvParser western-macos-roman remote file encoding', async t => {
  const url = 'https://raw.githubusercontent.com/frictionlessdata/test-data/master/files/csv/encodings/western-macos-roman.csv'
  const file = await data.open(url)
  const rows = await toArray(await csvParser(file))
  t.deepEqual(rows[1], ['Réunion','ECS','1989','838462813'])
})

test('xlsxParser works with XLS files', async t => {
  const path_ = 'test/fixtures/sample.xls'
  const file = await data.open(path_)
  const rows = await toArray(await xlsxParser(file))
  t.deepEqual(rows[0], ['number', 'string', 'boolean'])
})

test('xlsxParser works with keyed option', async t => {
  const path_ = 'test/fixtures/sample.xls'
  const file = await data.open(path_)
  const keyed = true
  const rows = await toArray(await xlsxParser(file, keyed))
  t.deepEqual(rows[0], {number: '1', string: 'two', boolean: 'TRUE'})
})

test('xlsxParser works with specified sheet index', async t => {
  const path_ = 'test/fixtures/sample-multi-sheet.xlsx'
  const file = await data.open(path_)
  let sheetIdx = 0
  let rows = await toArray(await xlsxParser(file, false, sheetIdx))
  t.deepEqual(rows[0], ['a', 'b', 'c'])
  sheetIdx = 1
  rows = await toArray(await xlsxParser(file, false, sheetIdx))
  t.deepEqual(rows[0], ['d', 'e', 'f'])
})

test('xlsxParser works with specified sheet name', async t => {
  const path_ = 'test/fixtures/sample-multi-sheet.xlsx'
  const file = await data.open(path_)
  let sheetName = 'Sheet1'
  let rows = await toArray(await xlsxParser(file, false, sheetName))
  t.deepEqual(rows[0], ['a', 'b', 'c'])
  sheetName = 'Sheet2'
  rows = await toArray(await xlsxParser(file, false, sheetName))
  t.deepEqual(rows[0], ['d', 'e', 'f'])
})

test('guessParseOptions function', async t => {
  const path_ = 'test/fixtures/semicolon-delimited.csv'
  let file = await data.open(path_)
  let parseOptions = await guessParseOptions(file)
  t.is(parseOptions.delimiter, ';')

  const url_ = 'https://raw.githubusercontent.com/frictionlessdata/test-data/master/files/csv/separators/semicolon.csv'
  file = await data.open(url_)
  parseOptions = await guessParseOptions(file)
  t.is(parseOptions.delimiter, ';')
})
