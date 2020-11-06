import assert from 'assert'
import toArray from 'stream-to-array'
import { csvParser, guessParseOptions } from '../../src/parser/csv'
import * as data from '../../src/index'

describe('csvParser', function () {
  this.timeout(30000) // all tests in this suite get 10 seconds before timeout

  it('csvParser iso8859 file encoding', async () => {
    const path_ = 'test/fixtures/encodings/iso8859.csv'
    const file = data.open(path_)
    const parsed_file = await csvParser(file)
    const rows = await toArray(parsed_file)
    assert.deepStrictEqual(rows[1], ['Réunion', 'ECS', '1989', '838462813'])
  })

  it('csvParser iso8859 remote file encoding', async () => {
    const url =
      'https://raw.githubusercontent.com/frictionlessdata/test-data/master/files/csv/encodings/iso8859.csv'
    const file = data.open(url)
    const parsed_file = await csvParser(file)
    const rows = await toArray(parsed_file)
    assert.deepStrictEqual(rows[1], ['R�union', 'ECS', '1989', '838462813'])
  })

  it('csvParser western-macos-roman file encoding', async () => {
    const path_ = 'test/fixtures/encodings/western-macos-roman.csv'
    const file = data.open(path_)
    const parsed_file = await csvParser(file)
    const rows = await toArray(parsed_file)
    assert.deepStrictEqual(rows[1], ['RŽunion', 'ECS', '1989', '838462813'])
  })

  it('csvParser western-macos-roman remote file encoding', async () => {
    const url =
      'https://raw.githubusercontent.com/frictionlessdata/test-data/master/files/csv/encodings/western-macos-roman.csv'
    const file = data.open(url)
    const parsed_file = await csvParser(file)
    const rows = await toArray(parsed_file)
    assert.notDeepStrictEqual(rows[1], ['Réunion', 'ECS', '1989', '838462813'])
  })

  it('guessParseOptions for local data', async () => {
    const path_ = 'test/fixtures/semicolon-delimited.csv'
    let file = data.open(path_)
    let parseOptions = await guessParseOptions(file)
    assert.deepStrictEqual(parseOptions.delimiter, ';')
  })

  it('guessParseOptions for local data', async () => {
    const url_ =
      'https://raw.githubusercontent.com/frictionlessdata/test-data/master/files/csv/separators/semicolon.csv'
    let file = await data.open(url_)
    let parseOptions = await guessParseOptions(file)
    assert.deepStrictEqual(parseOptions.delimiter, ';')
  })
})
