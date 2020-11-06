import assert from 'assert'
import path from 'path'
import nock from 'nock'
import * as data from '../src/data'

describe('isUrl', () => {
  it('Tests if given path is url or not', async () => {
    let notUrl = 'not/url/path'
    let res = data.isUrl(notUrl)
    assert.strictEqual(res, false)

    notUrl = '/not/url/path/'
    res = data.isUrl(notUrl)
    assert.strictEqual(res, false)

    let url = 'https://test.com'
    res = data.isUrl(url)
    assert.strictEqual(res, true)

    url = 'http://test.com'
    res = data.isUrl(url)
    assert.strictEqual(res, true)

    url = 'HTTP://TEST.COM'
    res = data.isUrl(url)
    assert.strictEqual(res, true)

    url = '//test.com'
    res = data.isUrl(url)
    assert.strictEqual(res, true)
  })
})

describe('parseDatasetIdentifier', () => {
  it('parseDatasetIdentifier function with local path', async () => {
    const paths = [
      '../dir/dataset/',
      './',
      './datapackage.json',
      '../datapackage.json',
      'datapackage.json',
    ]
    paths.forEach(async (path_) => {
      const res = await data.parseDatasetIdentifier(path_)
      const normalizedPath = path.posix
        .resolve(path_)
        .replace(/\/?datapackage\.json/, '')
      const exp = {
        name: path.basename(normalizedPath),
        owner: null,
        path: normalizedPath,
        type: 'local',
        original: path_,
        version: '',
      }
      assert.deepStrictEqual(res, exp)
    })
  })
  it('parseDatasetIdentifier function with random url', async () => {
    const url_ = 'https://example.com/datasets/co2-ppm/'
    const res = await data.parseDatasetIdentifier(url_)
    const exp = {
      name: 'co2-ppm',
      owner: null,
      path: 'https://example.com/datasets/co2-ppm/',
      type: 'url',
      original: url_,
      version: '',
    }
    assert.deepStrictEqual(res, exp)
  })
  it('parseDatasetIdentifier function with github url', async () => {
    const url_ = 'https://github.com/datasets/co2-ppm'
    const res = await data.parseDatasetIdentifier(url_)
    const exp = {
      name: 'co2-ppm',
      owner: 'datasets',
      path: 'https://raw.githubusercontent.com/datasets/co2-ppm/master/',
      type: 'github',
      original: url_,
      version: 'master',
    }
    assert.deepStrictEqual(res, exp)
  })
  it('parseDatasetIdentifier function with datahub url', async () => {
    nock('https://api.datahub.io')
      .persist()
      .get('/resolver/resolve?path=core/co2-ppm')
      .reply(200, { packageid: 'co2-ppm', userid: 'core' })
      .get('/source/core/co2-ppm/successful')
      .reply(200, { id: 'core/co2-ppm/3' })

    const url_ = 'https://datahub.io/core/co2-ppm'
    const res = await data.parseDatasetIdentifier(url_)
    const exp = {
      name: 'co2-ppm',
      owner: 'core',
      path: 'https://pkgstore.datahub.io/core/co2-ppm/3/',
      type: 'datahub',
      original: url_,
      version: 3,
    }
    assert.deepStrictEqual(res, exp)
  })
  it('parseDatasetIdentifier function with datahub url and id different from username', async () => {
    nock('https://api.datahub.io')
      .persist()
      .get('/resolver/resolve?path=username/dataset')
      .reply(200, { packageid: 'dataset', userid: 'userid' })
      .get('/source/userid/dataset/successful')
      .reply(200, { id: 'userid/dataset/2' })

    const url_ = 'https://datahub.io/username/dataset'
    const res = await data.parseDatasetIdentifier(url_)
    const exp = {
      name: 'dataset',
      owner: 'username',
      path: 'https://pkgstore.datahub.io/userid/dataset/2/',
      type: 'datahub',
      original: url_,
      version: 2,
    }
    assert.deepStrictEqual(res, exp)
  })
})

describe('parsePath', () => {
  it("parsePath function works with local path'", async () => {
    const path_ = 'datajs/test/fixtures/sample.csv'
    const res = data.parsePath(path_)
    assert.strictEqual(res.path, path_)
    assert.strictEqual(res.pathType, 'local')
    assert.strictEqual(res.name, 'sample')
    assert.strictEqual(res.format, 'csv')
    assert.strictEqual(res.mediatype, 'text/csv')
  })

  it('parsePath function works with remote url', async () => {
    const path_ =
      'https://raw.githubusercontent.com/datasets/finance-vix/master/data/vix-daily.csv'
    const res = data.parsePath(path_)
    assert.strictEqual(res.path, path_)
    assert.strictEqual(res.pathType, 'remote')
    assert.strictEqual(res.name, 'vix-daily')
    assert.strictEqual(res.format, 'csv')
    assert.strictEqual(res.mediatype, 'text/csv')
  })

  it('parsePath function with remote url without conventional filename', async () => {
    const path_ =
      'http://api.worldbank.org/indicator/NY.GDP.MKTP.CD?format=csv'
    const res = data.parsePath(path_)
    assert.strictEqual(res.path, path_)
    assert.strictEqual(res.pathType, 'remote')
    assert.strictEqual(res.name, 'ny.gdp.mktp')
    assert.strictEqual(res.format, 'csv')
    assert.strictEqual(res.mediatype, undefined)
  })
})

describe('isDataset', () => {
  it('isDataset function works on different examples', async () => {
    let pathToDataset = 'test/fixtures/co2-ppm'
    let res = data.isDataset(pathToDataset)
    assert.strictEqual(res, true)

    pathToDataset = 'test/fixtures/co2-ppm/datapackage.json'
    res = data.isDataset(pathToDataset)
    assert.strictEqual(res, true)

    const pathToFile = 'test/fixtures/sample.csv'
    res = data.isDataset(pathToFile)
    assert.strictEqual(res, false)

    let urlToDataset = 'http://test.com/'
    res = data.isDataset(urlToDataset)
    assert.strictEqual(res, false)

    urlToDataset = 'http://test.com/dir'
    res = data.isDataset(urlToDataset)
    assert.strictEqual(res, false)

    urlToDataset = 'http://test.com/dir/datapackage.json'
    res = data.isDataset(urlToDataset)
    assert.strictEqual(res, true)

    let urlToFile = 'http://test.com/dir/file.csv'
    res = data.isDataset(urlToFile)
    assert.strictEqual(res, false)

    urlToFile = 'http://test.com/file.csv'
    res = data.isDataset(urlToFile)
    assert.strictEqual(res, false)
  })
})
