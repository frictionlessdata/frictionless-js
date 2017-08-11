const test = require('ava')

const toArray = require('stream-to-array')

const utils = require('../lib/data.js')

// ====================================
// isUrl

test('Tests if given path is url or not', t => {
  let notUrl = 'not/url/path'
  let res = utils.isUrl(notUrl)
  t.false(res)
  notUrl = '/not/url/path/'
  res = utils.isUrl(notUrl)
  t.false(res)
  let url = 'https://test.com'
  res = utils.isUrl(url)
  t.true(res)
  url = 'http://test.com'
  res = utils.isUrl(url)
  t.true(res)
  url = 'HTTP://TEST.COM'
  res = utils.isUrl(url)
  t.true(res)
  url = '//test.com'
  res = utils.isUrl(url)
  t.true(res)
})

// ====================================
// isPackage

test('isPackage function works', t => {
  let pathToPkg = 'test/fixtures/co2-ppm'
  let res = utils.isPackage(pathToPkg)
  t.true(res)
  pathToPkg = 'test/fixtures/co2-ppm/datapackage.json'
  res = utils.isPackage(pathToPkg)
  t.true(res)
  const pathToFile = 'test/fixtures/sample.csv'
  res = utils.isPackage(pathToFile)
  t.false(res)
  let urlToPkg = 'http://test.com/'
  res = utils.isPackage(urlToPkg)
  t.true(res)
  urlToPkg = 'http://test.com/dir'
  res = utils.isPackage(urlToPkg)
  t.true(res)
  urlToPkg = 'http://test.com/dir/datapackage.json'
  res = utils.isPackage(urlToPkg)
  t.true(res)
  let urlToFile = 'http://test.com/dir/file.csv'
  res = utils.isPackage(urlToFile)
  t.false(res)
  urlToFile = 'http://test.com/file.csv'
  res = utils.isPackage(urlToFile)
  t.false(res)
})

// ====================================
// parsePath

test('parsePath function with local path', t => {
  const path_ = 'test/fixtures/sample.csv'
  const res = utils.parsePath(path_)
  t.is(res.path, path_)
  t.is(res.pathType, 'local')
  t.is(res.name, 'sample')
  t.is(res.format, 'csv')
  t.is(res.mediatype, 'text/csv')
})

test('parsePath function with remote url', t => {
  const path_ = 'https://raw.githubusercontent.com/datasets/finance-vix/master/data/vix-daily.csv'
  const res = utils.parsePath(path_)
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
// of resources
const testFile = async (t, resource) => {
  t.is(resource.path, 'test/fixtures/sample.csv')
  t.is(resource.size, 46)
  t.is(resource.hash, 'sGYdlWZJioAPv5U2XOKHRw==')
  await testResourceStream(t, resource)
}

const testResourceStream = async (t, resource) => {
  // Test stream
  const stream = await resource.stream()
  const out = await toArray(stream)
  t.true(out.toString().includes('number,string,boolean'))

  // Test buffer
  const buffer = await resource.buffer
  t.is(buffer.toString().slice(0, 21), 'number,string,boolean')

  // Test rows
  const rowStream = await resource.rows()
  const rows = await toArray(rowStream)
  t.deepEqual(rows[0], ['number', 'string', 'boolean'])
  t.deepEqual(rows[1], ['1', 'two', 'true'])

  // Test rows with keyed option (rows as objects)
  const rowStreamKeyed = await resource.rows({keyed: true})
  const rowsAsObjects = await toArray(rowStreamKeyed)
  t.deepEqual(rowsAsObjects[0], {number: '1', string: 'two', boolean: 'true'})
  t.deepEqual(rowsAsObjects[1], {number: '3', string: 'four', boolean: 'false'})
}

test('File class with path', async t => {
  // With path
  const path_ = 'test/fixtures/sample.csv'
  const res = utils.File.load(path_)
  await testFile(t, res)
})

test('File class with descriptor', async t => {
  const descriptor = {path: 'test/fixtures/sample.csv'}
  const obj2 = utils.File.load(descriptor)
  await testFile(t, obj2)
})

test('File with path and basePath', t => {
  const obj3 = utils.File.load('sample.csv', {basePath: 'test/fixtures'})
  testFile(t, obj3)
})

test('File with inline JS data', async t => {
  const data = {
    name: 'abc'
  }
  const resource = utils.File.load({data})
  t.is(resource.size, 14)
  const stream = await resource.stream()
  const out = await toArray(stream)
  t.is(out.toString(), JSON.stringify(data))
})

test('File with inline text (CSV) data', async t => {
  const data = `number,string,boolean
1,two,true
3,four,false
`
  // To make it testable with testFile we add the path but it is not needed
  const resource = utils.File.load({
    path: 'test/fixtures/sample.csv',
    format: 'csv',
    data
  })
  await testFile(t, resource)
})

test('File with inline array data', async t => {
  const data = [
    ['number', 'string', 'boolean'],
    [1, 'two', true],
    [3, 'four', false]
  ]
  // To make it testable with testFile we add the path but it is not needed
  const resource = utils.File.load({
    data
  })
  t.is(resource.size, 63)
  const stream = await resource.stream()
  const out = await toArray(stream)
  t.is(out.toString(), JSON.stringify(data))

  const rows = await resource.rows()
  const out2 = await toArray(rows)
  t.is(out2.length, 3)
  t.is(out2[0][0], data[0][0])
  // For some reason this fails with no difference
  // t.is(out2, data)
  // but this works ...
  t.is(JSON.stringify(out2), JSON.stringify(data))
})

test.serial('File class stream with url', async t => {
  // TODO: mock this out
  const url = 'https://raw.githubusercontent.com/datahq/datahub-cli/master/test/fixtures/sample.csv'
  const res = utils.File.load(url)
  await testResourceStream(t, res)
})

test.serial('File class for addSchema method', async t => {
  const path_ = 'test/fixtures/sample.csv'
  const resource = utils.File.load(path_)
  t.is(resource.descriptor.schema, undefined)
  await resource.addSchema()
  t.is(resource.descriptor.schema.fields[1].type, 'string')
  const headers = resource.descriptor.schema.fields.map(field => field.name)
  t.deepEqual(headers, ['number', 'string', 'boolean'])
})

// ====================================
// Dataset class
// ====================================

test('Dataset constructor works', t => {
  const pkg = new utils.Dataset()
  t.deepEqual(pkg.identifier, {
    path: null,
    owner: null
  })
  t.deepEqual(pkg.descriptor, {})
  t.deepEqual(pkg.path, null)
  t.is(pkg.readme, null)
})

test('Dataset.load works with co2-ppm', async t => {
  const path = 'test/fixtures/co2-ppm'
  const pkg2 = await utils.Dataset.load(path)
  t.deepEqual(pkg2.identifier, {
    path,
    type: 'local'
  })
  t.deepEqual(pkg2.path, path)

  t.is(pkg2.descriptor.name, 'co2-ppm')
  t.is(pkg2.resources.length, 6)
  t.is(pkg2.resources[0].descriptor.name, 'co2-mm-mlo')
  t.is(pkg2.resources[0].path, 'test/fixtures/co2-ppm/data/co2-mm-mlo.csv')
  t.true(pkg2.readme.includes('CO2 PPM - Trends in Atmospheric Carbon Dioxide.'))
})

test('Dataset.load with dir/datapckage.json', async t => {
  const path = 'test/fixtures/co2-ppm/datapackage.json'
  const pkg = await utils.Dataset.load(path)
  t.is(pkg.descriptor.name, 'co2-ppm')
  t.is(pkg.identifier.type, 'local')
  t.is(pkg.resources.length, 6)
  t.true(pkg.readme.includes('CO2 PPM - Trends in Atmospheric Carbon Dioxide.'))
})

test('Dataset.load with url-directory', async t => {
  const url = 'https://raw.githubusercontent.com/datasets/co2-ppm/master/'
  const pkg = await utils.Dataset.load(url)
  t.is(pkg.descriptor.name, 'co2-ppm')
  t.is(pkg.identifier.type, 'remote')
  t.is(pkg.resources.length, 6)
  t.true(pkg.readme.includes('CO2 PPM - Trends in Atmospheric Carbon Dioxide.'))
})

test('Dataset.load with url/datapackage.json', async t => {
  const url = 'https://raw.githubusercontent.com/datasets/co2-ppm/master/datapackage.json'
  const pkg = await utils.Dataset.load(url)
  t.is(pkg.descriptor.name, 'co2-ppm')
  t.is(pkg.identifier.type, 'remote')
  t.is(pkg.resources.length, 6)
  t.true(pkg.readme.includes('CO2 PPM - Trends in Atmospheric Carbon Dioxide.'))
})

test('Dataset.addResource method works', t => {
  const resourceAsPlainObj = {
    name: 'sample',
    path: 'test/fixtures/sample.csv',
    format: 'csv'
  }
  const resourceAsResourceObj = utils.File.load(resourceAsPlainObj)
  const pkg = new utils.Dataset({
    resources: []
  })
  t.is(pkg.resources.length, 0)
  t.is(pkg.descriptor.resources.length, 0)
  pkg.addResource(resourceAsPlainObj)
  t.is(pkg.resources.length, 1)
  t.is(pkg.descriptor.resources.length, 1)
  pkg.addResource(resourceAsResourceObj)
  t.is(pkg.resources.length, 2)
  t.is(pkg.descriptor.resources.length, 2)
})
