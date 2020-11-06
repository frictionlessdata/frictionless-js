import assert from 'assert'
import path from 'path'
import nock from 'nock'
import * as data from '../src/data'
import { testFileStream } from './file-base'

describe('File Remote', function () {
  this.timeout(50000) // all tests in this suite get 10 seconds before timeout

  it('File class stream with url', async () => {
    const url =
      'https://raw.githubusercontent.com/datahq/datahub-cli/master/test/fixtures/sample.csv'
    nock('https://raw.githubusercontent.com')
      .get('/datahq/datahub-cli/master/test/fixtures/sample.csv')
      .replyWithFile(200, path.join(__dirname, '/fixtures/sample.csv'))

    nock.cleanAll()

    const file = data.open(url)
    await testFileStream(assert, file)
  })

  it('File class for addSchema method', async () => {
    let path_ =
      'https://raw.githubusercontent.com/datahq/datahub-cli/master/test/fixtures/sample.csv'
    let file = data.open(path_)
    assert.strictEqual(file.descriptor.schema, undefined)

    await file.addSchema()
    assert.strictEqual(file.descriptor.schema.fields[1].type, 'string')

    let headers = file.descriptor.schema.fields.map((field) => field.name)
    assert.deepStrictEqual(headers, ['number', 'string', 'boolean'])
  })

  it('File classes have displayName method', async () => {
    const fileRemote = data.open(
      'https://raw.githubusercontent.com/datahq/datahub-cli/master/test/fixtures/sample.csv'
    )
    assert.strictEqual(fileRemote.displayName, 'FileRemote')
  })
})
