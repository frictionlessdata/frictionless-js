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

test('FileInterface size and hash', async (t) => {
  const file = new data.open(
    new File(['some text'], 'test.txt', { type: 'text/plain' })
  )

  const hash = await file.hash()

  t.is(hash, '552e21cd4cd9918678e3c1a0df491bc3')
  t.is(file.size, 9)
})
