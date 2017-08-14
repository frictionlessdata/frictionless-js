const path = require('path')
const test = require('ava')
const nock = require('nock')

const toArray = require('stream-to-array')

const data = require('../lib/index')

// ====================================
// isUrl

test('Tests if given path is url or not', t => {
  let notUrl = 'not/url/path'
  let res = data.isUrl(notUrl)
  t.false(res)
  notUrl = '/not/url/path/'
  res = data.isUrl(notUrl)
  t.false(res)
  let url = 'https://test.com'
  res = data.isUrl(url)
  t.true(res)
  url = 'http://test.com'
  res = data.isUrl(url)
  t.true(res)
  url = 'HTTP://TEST.COM'
  res = data.isUrl(url)
  t.true(res)
  url = '//test.com'
  res = data.isUrl(url)
  t.true(res)
})

// ====================================
// isDataset

test('isDataset function works', t => {
  let pathToDataset = 'test/fixtures/co2-ppm'
  let res = data.isDataset(pathToDataset)
  t.true(res)
  pathToDataset = 'test/fixtures/co2-ppm/datapackage.json'
  res = data.isDataset(pathToDataset)
  t.true(res)
  const pathToFile = 'test/fixtures/sample.csv'
  res = data.isDataset(pathToFile)
  t.false(res)
  let urlToDataset = 'http://test.com/'
  res = data.isDataset(urlToDataset)
  t.true(res)
  urlToDataset = 'http://test.com/dir'
  res = data.isDataset(urlToDataset)
  t.true(res)
  urlToDataset = 'http://test.com/dir/datapackage.json'
  res = data.isDataset(urlToDataset)
  t.true(res)
  let urlToFile = 'http://test.com/dir/file.csv'
  res = data.isDataset(urlToFile)
  t.false(res)
  urlToFile = 'http://test.com/file.csv'
  res = data.isDataset(urlToFile)
  t.false(res)
})

// ====================================
// parsePath

test('parsePath function with local path', t => {
  const path_ = 'test/fixtures/sample.csv'
  const res = data.parsePath(path_)
  t.is(res.path, path_)
  t.is(res.pathType, 'local')
  t.is(res.name, 'sample')
  t.is(res.format, 'csv')
  t.is(res.mediatype, 'text/csv')
})

test('parsePath function with remote url', t => {
  const path_ = 'https://raw.githubusercontent.com/datasets/finance-vix/master/data/vix-daily.csv'
  const res = data.parsePath(path_)
  t.is(res.path, path_)
  t.is(res.pathType, 'remote')
  t.is(res.name, 'vix-daily')
  t.is(res.format, 'csv')
  t.is(res.mediatype, 'text/csv')
})

// ====================================
// File class
// ====================================

// common method to test all the functionality which we can use for all types
// of files
const testFile = async (t, file) => {
  t.is(file.path, 'test/fixtures/sample.csv')
  t.is(file.size, 46)
  t.is(file.hash, 'sGYdlWZJioAPv5U2XOKHRw==')
  await testFileStream(t, file)
}

const testFileStream = async (t, file) => {
  // Test stream
  const stream = await file.stream()
  const out = await toArray(stream)
  t.true(out.toString().includes('number,string,boolean'))

  // Test buffer
  const buffer = await file.buffer
  t.is(buffer.toString().slice(0, 21), 'number,string,boolean')

  // Test rows
  const rowStream = await file.rows()
  const rows = await toArray(rowStream)
  t.deepEqual(rows[0], ['number', 'string', 'boolean'])
  t.deepEqual(rows[1], ['1', 'two', 'true'])

  // Test rows with keyed option (rows as objects)
  const rowStreamKeyed = await file.rows({keyed: true})
  const rowsAsObjects = await toArray(rowStreamKeyed)
  t.deepEqual(rowsAsObjects[0], {number: '1', string: 'two', boolean: 'true'})
  t.deepEqual(rowsAsObjects[1], {number: '3', string: 'four', boolean: 'false'})
}

test('File class with path', async t => {
  // With path
  const path_ = 'test/fixtures/sample.csv'
  const res = data.File.load(path_)
  await testFile(t, res)
})

test('File class with descriptor', async t => {
  const descriptor = {path: 'test/fixtures/sample.csv'}
  const obj2 = data.File.load(descriptor)
  await testFile(t, obj2)
})

test('File with path and basePath', t => {
  const obj3 = data.File.load('sample.csv', {basePath: 'test/fixtures'})
  testFile(t, obj3)
})

test('File with inline JS data', async t => {
  const inlineData = {
    name: 'abc'
  }
  const file = data.File.load({data:inlineData})
  t.is(file.size, 14)
  const stream = await file.stream()
  const out = await toArray(stream)
  t.is(out.toString(), JSON.stringify(inlineData))
})

test('File with inline text (CSV) data', async t => {
  const inlineData = `number,string,boolean
1,two,true
3,four,false
`
  // To make it testable with testFile we add the path but it is not needed
  const file = data.File.load({
    path: 'test/fixtures/sample.csv',
    format: 'csv',
    inlineData
  })
  await testFile(t, file)
})

test('File with inline array data', async t => {
  const inlineData = [
    ['number', 'string', 'boolean'],
    [1, 'two', true],
    [3, 'four', false]
  ]
  // To make it testable with testFile we add the path but it is not needed
  const file = data.File.load({
    data:inlineData
  })
  t.is(file.size, 63)
  const stream = await file.stream()
  const out = await toArray(stream)
  t.is(out.toString(), JSON.stringify(inlineData))

  const rows = await file.rows()
  const out2 = await toArray(rows)
  t.is(out2.length, 3)
  t.is(out2[0][0], inlineData[0][0])
  // For some reason this fails with no difference
  // t.is(out2, data)
  // but this works ...
  t.is(JSON.stringify(out2), JSON.stringify(inlineData))
})

test.serial('File class stream with url', async t => {
  // TODO: mock this out
  const url = 'https://raw.githubusercontent.com/datahq/datahub-cli/master/test/fixtures/sample.csv'
  nock('https://raw.githubusercontent.com')
    .persist()
    .get('/datahq/datahub-cli/master/test/fixtures/sample.csv')
    .replyWithFile(200, path.join(__dirname, '/fixtures/sample.csv'))
  const res = data.File.load(url)
  await testFileStream(t, res)
})

test.serial('File class for addSchema method', async t => {
  const path_ = 'test/fixtures/sample.csv'
  const file = data.File.load(path_)
  t.is(file.descriptor.schema, undefined)
  await file.addSchema()
  t.is(file.descriptor.schema.fields[1].type, 'string')
  const headers = file.descriptor.schema.fields.map(field => field.name)
  t.deepEqual(headers, ['number', 'string', 'boolean'])
})

// ====================================
// Dataset class
// ====================================

test('Dataset constructor works', t => {
  const dataset = new data.Dataset()
  t.deepEqual(dataset.identifier, {
    path: null,
    owner: null
  })
  t.deepEqual(dataset.descriptor, {})
  t.deepEqual(dataset.path, null)
  t.is(dataset.readme, null)
})

test('Dataset.load works with co2-ppm', async t => {
  const path = 'test/fixtures/co2-ppm'
  const dataset2 = await data.Dataset.load(path)
  t.deepEqual(dataset2.identifier, {
    path,
    type: 'local'
  })
  t.deepEqual(dataset2.path, path)

  t.is(dataset2.descriptor.name, 'co2-ppm')
  t.is(dataset2.resources.length, 6)
  t.is(dataset2.resources[0].descriptor.name, 'co2-mm-mlo')
  t.is(dataset2.resources[0].path, 'test/fixtures/co2-ppm/data/co2-mm-mlo.csv')
  t.true(dataset2.readme.includes('CO2 PPM - Trends in Atmospheric Carbon Dioxide.'))
})

test('Dataset.load with dir/datapckage.json', async t => {
  const path = 'test/fixtures/co2-ppm/datapackage.json'
  const dataset = await data.Dataset.load(path)
  t.is(dataset.descriptor.name, 'co2-ppm')
  t.is(dataset.identifier.type, 'local')
  t.is(dataset.resources.length, 6)
  t.true(dataset.readme.includes('CO2 PPM - Trends in Atmospheric Carbon Dioxide.'))
})

test('Dataset.load with url-directory', async t => {
  const url = 'https://raw.githubusercontent.com/datasets/co2-ppm/master/'
  nock('https://raw.githubusercontent.com')
    .persist()
    .get('/datasets/co2-ppm/master/datapackage.json')
    .replyWithFile(200, path.join(__dirname, '/fixtures/co2-ppm/datapackage.json'))
  nock('https://raw.githubusercontent.com')
    .persist()
    .get('/datasets/co2-ppm/master/README.md')
    .replyWithFile(200, path.join(__dirname, '/fixtures/co2-ppm/README.md'))
  const dataset = await data.Dataset.load(url)
  t.is(dataset.descriptor.name, 'co2-ppm')
  t.is(dataset.identifier.type, 'remote')
  t.is(dataset.resources.length, 6)
  t.true(dataset.readme.includes('CO2 PPM - Trends in Atmospheric Carbon Dioxide.'))
})

test('Dataset.load with url/datapackage.json', async t => {
  const url = 'https://raw.githubusercontent.com/datasets/co2-ppm/master/datapackage.json'
  nock('https://raw.githubusercontent.com')
    .persist()
    .get('/datasets/co2-ppm/master/datapackage.json')
    .replyWithFile(200, path.join(__dirname, '/fixtures/co2-ppm/datapackage.json'))
  nock('https://raw.githubusercontent.com')
    .persist()
    .get('/datasets/co2-ppm/master/README.md')
    .replyWithFile(200, path.join(__dirname, '/fixtures/co2-ppm/README.md'))
  const dataset = await data.Dataset.load(url)
  t.is(dataset.descriptor.name, 'co2-ppm')
  t.is(dataset.identifier.type, 'remote')
  t.is(dataset.resources.length, 6)
  t.true(dataset.readme.includes('CO2 PPM - Trends in Atmospheric Carbon Dioxide.'))
})

test('Dataset.addResource method works', t => {
  const resourceAsPlainObj = {
    name: 'sample',
    path: 'test/fixtures/sample.csv',
    format: 'csv'
  }
  const resourceAsFileObj = data.File.load(resourceAsPlainObj)
  const dataset = new data.Dataset({
    resources: []
  })
  t.is(dataset.resources.length, 0)
  t.is(dataset.descriptor.resources.length, 0)
  dataset.addResource(resourceAsPlainObj)
  t.is(dataset.resources.length, 1)
  t.is(dataset.descriptor.resources.length, 1)
  dataset.addResource(resourceAsFileObj)
  t.is(dataset.resources.length, 2)
  t.is(dataset.descriptor.resources.length, 2)
})
