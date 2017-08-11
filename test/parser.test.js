const test = require('ava')
const toArray = require('stream-to-array')

const {xlsxParser} = require('../lib/parser/xlsx')
const {File} = require('../lib/data')

test('xlsxParser works with XLSX files', async t => {
  const path_ = 'test/fixtures/sample.xlsx'
  const resource = await File.load(path_)
  const rows = await toArray(await xlsxParser(resource))
  t.deepEqual(rows[0], ['number', 'string', 'boolean'])
})

test('xlsxParser works with XLS files', async t => {
  const path_ = 'test/fixtures/sample.xls'
  const resource = await File.load(path_)
  const rows = await toArray(await xlsxParser(resource))
  t.deepEqual(rows[0], ['number', 'string', 'boolean'])
})

test('xlsxParser works with keyed option', async t => {
  const path_ = 'test/fixtures/sample.xls'
  const resource = await File.load(path_)
  const keyed = true
  const rows = await toArray(await xlsxParser(resource, keyed))
  t.deepEqual(rows[0], {number: '1', string: 'two', boolean: 'TRUE'})
})

test('xlsxParser works with semicolon delimeter', async t => {
  const path_ = 'test/fixtures/semicolon-delimited.csv'
  const resource = await File.load(path_)
  resource.descriptor.dialect = {
    delimiter: ';'
  }
  const rows = await toArray(await xlsxParser(resource))
  t.deepEqual(rows[0], ['id', 'name'])
  t.deepEqual(rows[1], ['1', 'John'])
})
