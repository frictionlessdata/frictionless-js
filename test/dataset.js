import assert from 'assert'
import path from 'path'
import nock from 'nock'
import * as data from '../src/data'
import { Dataset } from '../src/dataset'

describe('Dataset', () => {
  it('Dataset constructor works', async () => {
    const dataset = new Dataset()
    assert.deepStrictEqual(dataset.identifier, {
      path: null,
      owner: null,
    })

    assert.deepStrictEqual(dataset.descriptor, {})
    assert.deepStrictEqual(dataset.path, null)
    assert.deepStrictEqual(dataset.readme, undefined)
  })

  it('Dataset with inline README works', async () => {
    const path = 'test/fixtures/dp-with-inline-readme'
    const dataset = await Dataset.load(path)
    assert.deepStrictEqual(dataset.identifier.type, 'local')
    assert.deepStrictEqual(dataset.readme, 'This is the README')
  })

  it('Dataset.load works with co2-ppm', async () => {
    const path = 'test/fixtures/co2-ppm'
    const dataset2 = await Dataset.load(path)
    assert.strictEqual(dataset2.identifier.type, 'local')

    assert.strictEqual(dataset2.descriptor.name, 'co2-ppm')
    assert.strictEqual(dataset2.resources.length, 6)
    assert.strictEqual(dataset2.resources[0].descriptor.name, 'co2-mm-mlo')
    assert.strictEqual(
      dataset2.resources[0].path.includes(
        'test/fixtures/co2-ppm/data/co2-mm-mlo.csv'
      ),
      true
    )
    assert.strictEqual(
      dataset2.readme.includes(
        'CO2 PPM - Trends in Atmospheric Carbon Dioxide.'
      ),
      true
    )
  })

  it('Dataset.load with dir/datapckage.json', async () => {
    const path = 'test/fixtures/co2-ppm/datapackage.json'
    const dataset = await Dataset.load(path)
    assert.strictEqual(dataset.descriptor.name, 'co2-ppm')
    assert.strictEqual(dataset.identifier.type, 'local')
    assert.strictEqual(dataset.resources.length, 6)
    assert.strictEqual(
      dataset.readme.includes(
        'CO2 PPM - Trends in Atmospheric Carbon Dioxide.'
      ),
      true
    )
  })

  it('Dataset.load with url/datapackage.json', async () => {
    const url =
      'https://raw.githubusercontent.com/datasets/co2-ppm/master/datapackage.json'
    nock('https://raw.githubusercontent.com')
      .persist()
      .get('/datasets/co2-ppm/master/datapackage.json')
      .replyWithFile(
        200,
        path.join(__dirname, '/fixtures/co2-ppm/datapackage.json')
      )

    nock('https://raw.githubusercontent.com')
      .persist()
      .get('/datasets/co2-ppm/master/README.md')
      .replyWithFile(200, path.join(__dirname, '/fixtures/co2-ppm/README.md'))

    const dataset = await Dataset.load(url)
    assert.strictEqual(dataset.descriptor.name, 'co2-ppm')
    assert.strictEqual(dataset.identifier.type, 'url')
    assert.strictEqual(dataset.resources.length, 6)
    assert.strictEqual(
      dataset.readme.includes(
        'CO2 PPM - Trends in Atmospheric Carbon Dioxide.'
      ),
      true
    )
  })

  it('Dataset.addResource method works', async () => {
    const resourceAsPlainObj = {
      name: 'sample',
      path: 'test/fixtures/sample.csv',
      format: 'csv',
    }
    const resourceAsFileObj = data.open(resourceAsPlainObj)
    const dataset = new Dataset({ resources: [] })
    assert.strictEqual(dataset.resources.length, 0)
    assert.strictEqual(dataset.descriptor.resources.length, 0)

    dataset.addResource(resourceAsPlainObj)
    assert.strictEqual(dataset.resources.length, 1)
    assert.strictEqual(dataset.descriptor.resources.length, 1)

    dataset.addResource(resourceAsFileObj)
    assert.strictEqual(dataset.resources.length, 2)
    assert.strictEqual(dataset.descriptor.resources.length, 2)
  })
})

describe('Dataset.nock', function () {
  this.timeout(30000) // all tests in this suite get 10 seconds before timeout

  const url = 'https://raw.githubusercontent.com/datasets/co2-ppm/master/'
  it('Dataset.load with url-directory', async () => {
    nock('https://raw.githubusercontent.com')
      .persist()
      .get('/datasets/co2-ppm/master/datapackage.json')
      .replyWithFile(
        200,
        path.join(__dirname, '/fixtures/co2-ppm/datapackage.json')
      )

    nock('https://raw.githubusercontent.com')
      .persist()
      .get('/datasets/co2-ppm/master/README.md')
      .replyWithFile(200, path.join(__dirname, '/fixtures/co2-ppm/README.md'))

    // Added mocking for all remote files in the test dataset
    // Reason: FileRemote is now probing the remote resource to define its encoding
    nock('https://raw.githubusercontent.com')
      .persist()
      .get('/datasets/co2-ppm/master/data/co2-mm-mlo.csv')
      .replyWithFile(
        200,
        path.join(__dirname, '/fixtures/co2-ppm/data/co2-mm-mlo.csv')
      )

    nock('https://raw.githubusercontent.com')
      .persist()
      .get('/datasets/co2-ppm/master/data/co2-annmean-mlo.csv')
      .replyWithFile(
        200,
        path.join(__dirname, '/fixtures/co2-ppm/data/co2-annmean-mlo.csv')
      )

    nock('https://raw.githubusercontent.com')
      .persist()
      .get('/datasets/co2-ppm/master/data/co2-gr-mlo.csv')
      .replyWithFile(
        200,
        path.join(__dirname, '/fixtures/co2-ppm/data/co2-gr-mlo.csv')
      )

    nock('https://raw.githubusercontent.com')
      .persist()
      .get('/datasets/co2-ppm/master/data/co2-mm-gl.csv')
      .replyWithFile(
        200,
        path.join(__dirname, '/fixtures/co2-ppm/data/co2-mm-gl.csv')
      )

    nock('https://raw.githubusercontent.com')
      .persist()
      .get('/datasets/co2-ppm/master/data/co2-annmean-gl.csv')
      .replyWithFile(
        200,
        path.join(__dirname, '/fixtures/co2-ppm/data/co2-annmean-gl.csv')
      )

    nock('https://raw.githubusercontent.com')
      .persist()
      .get('/datasets/co2-ppm/master/data/co2-gr-gl.csv')
      .replyWithFile(
        200,
        path.join(__dirname, '/fixtures/co2-ppm/data/co2-gr-gl.csv')
      )

    nock('https://raw.githubusercontent.com')
      .persist()
      .get('/datasets/co2-ppm/master/datapackage.json')
      .replyWithFile(
        200,
        path.join(__dirname, '/fixtures/co2-ppm/datapackage.json')
      )

    nock.cleanAll()

    const dataset = await Dataset.load(url)
    assert.strictEqual(dataset.descriptor.name, 'co2-ppm')
    assert.strictEqual(dataset.identifier.type, 'url')
    assert.strictEqual(dataset.resources.length, 6)
    assert.strictEqual(
      dataset.readme.includes(
        'CO2 PPM - Trends in Atmospheric Carbon Dioxide.'
      ),
      true
    )
  })
})
