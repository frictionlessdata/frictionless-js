import assert from 'assert'
import * as data from '../src/data'
import toArray from 'stream-to-array'
import { File, computeHash } from '../src/file-base'
// common method to test all the functionality which we can use for all types
// of files
export const testFile = async (assert, file) => {
  assert.strictEqual(file.path, 'test/fixtures/sample.csv')
  assert.strictEqual(file.size, 46)
  await testFileStream(assert, file)
}

export const testFileStream = async (assert, file) => {
  // Test stream
  const stream = await file.stream()
  const out = await toArray(stream)
  assert.strictEqual(out.toString().includes('number,string,boolean'), true)

  // Test buffer
  const buffer = await file.buffer
  assert.strictEqual(buffer.toString().slice(0, 21), 'number,string,boolean')

  // Test rows
  const rowStream = await file.rows()
  const rows = await toArray(rowStream)
  assert.deepStrictEqual(rows[0], ['number', 'string', 'boolean'])
  assert.deepStrictEqual(rows[1], ['1', 'two', 'true'])

  // Test rows with keyed option (rows as objects)
  const rowStreamKeyed = await file.rows({ keyed: true })
  const rowsAsObjects = await toArray(rowStreamKeyed)
  assert.deepStrictEqual(rowsAsObjects[0], {
    number: '1',
    string: 'two',
    boolean: 'true',
  })
  assert.deepStrictEqual(rowsAsObjects[1], {
    number: '3',
    string: 'four',
    boolean: 'false',
  })
}

// testing the stream or the buffer for non-utf8 encoding will not work,
// as we moved the stream decoding from the data.js lib,
// so here we now testing if File.encoding property is correct

describe('File Base', async () => {
  it('cyrillic encoding is working', () => {
    const path_ = 'test/fixtures/sample-cyrillic-encoding.csv'
    const file = data.open(path_)
    //const buffer = await file.buffer
    //t.is(buffer.toString().slice(0, 12), 'номер, город')
    assert.strictEqual(file.encoding, 'windows-1251')
  })

  it('File class with path', async () => {
    // With path
    const path_ = 'test/fixtures/sample.csv'
    const res = data.open(path_)
    await testFile(assert, res)
  })

  it('File class with descriptor', async () => {
    const descriptor = { path: 'test/fixtures/sample.csv' }
    const obj2 = data.open(descriptor)
    await testFile(assert, obj2)
  })

  it('File with path and basePath', async () => {
    const obj3 = data.open('sample.csv', { basePath: 'test/fixtures' })
    testFile(assert, obj3)
  })

  it('File name has spaces and dots', async () => {
    let path_ = 'test/fixtures/some file.name.ext'
    let file = File.load(path_)
    assert.strictEqual(file.descriptor.name, 'some-file.name')
  })
})

describe('bufferInChunks', () => {
  it('File is loaded in chunks', async () => {
    const path_ = 'test/fixtures/sample-cyrillic-encoding.csv'
    const file = data.open(path_)

    file.bufferInChunks((chunk, percent) => {
      assert.strictEqual(chunk.length, 40)
      assert.strictEqual(typeof percent, 'number')
    })
  })
})

describe('computeHash', () => {
  it('compute hash256 of a file stream', async () => {
    const path_ = 'test/fixtures/sample-cyrillic-encoding.csv'
    const file = data.open(path_)

    let hash256 = await computeHash(file.stream(), file.size, 'sha256')
    let hashmd5 = await computeHash(file.stream(), file.size, 'md5')

    assert.strictEqual(
      hash256,
      '8eff5a7815864615309d48035b461b79aa1bdc4402924e97fc66e123725214fd'
    )
    assert.strictEqual(hashmd5, '37d3a5159433f0977afb03d01d4bde6e')
  })

  it('encodes the hash using base64', async () => {
    const path_ = 'test/fixtures/sample-cyrillic-encoding.csv'
    const file = data.open(path_)

    let hash256 = await computeHash(file.stream(), file.size, 'sha256', null, 'base64')

    assert.strictEqual(
      hash256,
      'jv9aeBWGRhUwnUgDW0Ybeaob3EQCkk6X/GbhI3JSFP0='
    )
  })
})

describe('hashSha256', () => {
  it('hashSha256 returns right hash', async () => {
    const path_ = 'test/fixtures/sample-cyrillic-encoding.csv'
    const file = data.open(path_)

    let hash = await file.hashSha256()
    assert.strictEqual(
      hash,
      '8eff5a7815864615309d48035b461b79aa1bdc4402924e97fc66e123725214fd'
    )
  })
})

describe('cached hash', () => {
  it('hashing the same file twice generates the same result', async () => {
    const path_ = 'test/fixtures/sample-cyrillic-encoding.csv'
    const file = data.open(path_)

    let hash1 = await file.hash()
    let hash2 = await file.hash()

    assert.strictEqual(hash1, hash2)
  })
})


describe('getSample', () => {
  it('returns in object for a stream', async () => {
    const path_ = 'test/fixtures/sample.xlsx'
    const file = data.open(path_)

    let rows = await file.getSample()
    assert.strictEqual(rows.length, 2)
  })
})
