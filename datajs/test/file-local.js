import assert from 'assert'
import * as data from '../src/data'

describe('File Local', function () {
  it('File class for addSchema method', async () => {
    let path_ = 'datajs/test/fixtures/sample.csv'
    let file = data.open(path_)
    assert.strictEqual(file.descriptor.schema, undefined)

    await file.addSchema()
    assert.strictEqual(file.descriptor.schema.fields[1].type, 'string')

    let headers = file.descriptor.schema.fields.map((field) => field.name)
    assert.deepStrictEqual(headers, ['number', 'string', 'boolean'])
  })

  it("File classes have displayName method'", () => {
    const fileLocal = data.open('datajs/test/fixtures/sample.csv')
    assert.strictEqual(fileLocal.displayName, 'FileLocal')
  })
})
