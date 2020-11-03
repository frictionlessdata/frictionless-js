import assert from 'assert'
import * as data from '../src/data'
import toArray from 'stream-to-array'
import { testFile } from './file-base'

describe('File-Inline', () => {
  it('File with inline JS data', async () => {
    const inlineData = {
      name: 'abc',
    }
    const file = data.open({ data: inlineData })
    const stream = await file.stream()
    const out = await toArray(stream)

    assert.strictEqual(file.size, 14)
    assert.strictEqual(out.toString(), JSON.stringify(inlineData))
  })

  it('File with inline text (CSV) data', async () => {
    const inlineData = `number,string,boolean\n1,two,true\n3,four,false`
    // To make it testable with testFile we add the path but it is not needed
    const file = data.open({
      path: 'test/fixtures/sample.csv',
      format: 'csv',
      inlineData,
    })
    await testFile(assert, file)
  })

  it('File with inline array data', async () => {
    const inlineData = [
      ['number', 'string', 'boolean'],
      [1, 'two', true],
      [3, 'four', false],
    ]
    // To make it testable with testFile we add the path but it is not needed
    const file = data.open({
      data: inlineData,
    })

    const stream = await file.stream()
    const out = await toArray(stream)
    const rows = await file.rows()
    const out2 = await toArray(rows)

    assert.strictEqual(file.size, 63)
    assert.strictEqual(out.toString(), JSON.stringify(inlineData))
    assert.strictEqual(out2.length, 3)
    assert.strictEqual(out2[0][0], inlineData[0][0])
    // For some reason this fails with no difference
    // assert.strictEqual(out2, data)
    // but this works ...
    assert.strictEqual(JSON.stringify(out2), JSON.stringify(inlineData))
  })

  it('addSchema method', async () => {
    const inlineData = [
      ['number', 'string', 'boolean'],
      [1, 'two', true],
      [3, 'four', false],
    ]
    let file = data.open({
      data: inlineData,
      format: 'csv',
    })
    assert.strictEqual(file.descriptor.schema, undefined)

    await file.addSchema()
    assert.strictEqual(file.descriptor.schema.fields[1].type, 'string')

    let headers = file.descriptor.schema.fields.map((field) => field.name)
    assert.deepStrictEqual(headers, ['number', 'string', 'boolean'])
  })
})
