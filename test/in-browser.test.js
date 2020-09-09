// requiring this to mock browser related env
// TODO - If you know exactly which browser globals you need, pass an array of them.
// e.g. browserEnv(['window', 'document', 'navigator']);

const browserEnv = require('browser-env')
browserEnv()

const test = require('ava')
const path = require('path')
const nock = require('nock')

const toArray = require('stream-to-array')

const data = require('../src/index')
const { testFileStream } = require('./index.test')

test('FileInterface size and hash', async (t) => {
  const file = new data.open(
    new File(['some text'], 'test.txt', { type: 'text/plain' })
  )

  const hash = await file.hash()

  t.is(hash, '552e21cd4cd9918678e3c1a0df491bc3')
  t.is(fileLocal.displayName, 'FileInterface')
  t.is(file.size, 9)
})

test('FileInterface stream()', async (t) => {
  const file = new data.open(
    new File(
      [
        `
    number,string,boolean
    1,two,true
    3,four,false
    `,
      ],
      'sample.csv',
      { type: 'text/csv' }
    )
  )

  await testFileStream(t, res)
})

test('FileInterface addSchema()', async (t) => {
  const file = new data.open(
    new File(
      [
        `
      number,string,boolean
      1,two,true
      3,four,false
      `,
      ],
      'sample.csv',
      { type: 'text/csv' }
    )
  )
  t.is(file.descriptor.schema, undefined)
  await file.addSchema()
  t.is(file.descriptor.schema.fields[1].type, 'string')
  let headers = file.descriptor.schema.fields.map((field) => field.name)
  t.deepEqual(headers, ['number', 'string', 'boolean'])

  await testFileStream(t, res)
})
