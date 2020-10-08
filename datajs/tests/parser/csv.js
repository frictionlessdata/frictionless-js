/**
 * 2020-10-08
 * Refactored to use ES6 imports and updated test suite from ava to Mochai
 * By Rising Odegua
 */

import assert from 'assert'
import toArray from 'stream-to-array'
import { csvParser, guessParseOptions } from '../../src/parser/csv'
import * as data from '../../src/index'

describe("csvParser", () => {
    it("csvParser iso8859 file encoding", async () => {
        const path_ = 'datajs/test/fixtures/encodings/iso8859.csv'
        const file = await data.open(path_)
        const rows = await toArray(await csvParser(file))
        assert.deepStrictEqual(rows[1], ['Réunion', 'ECS', '1989', '838462813'])
    })

    //this test works well, but is switched off, coz we froze remote encoding function.
    // it("csvParser iso8859 remote file encoding", async () => {
    //     const url = 'https://raw.githubusercontent.com/frictionlessdata/test-data/master/files/csv/encodings/iso8859.csv'
    //     const file = await data.open(url)
    //     const rows = await toArray(await csvParser(file))
    //     assert.deepStrictEqual(rows[1], ['Réunion', 'ECS', '1989', '838462813'])
    // })

    it("csvParser western-macos-roman file encoding", async () => {
        const path_ = 'datajs/test/fixtures/encodings/western-macos-roman.csv'
        const file = await data.open(path_)
        const rows = await toArray(await csvParser(file))
        assert.deepStrictEqual(rows[1], ['RŽunion', 'ECS', '1989', '838462813'])
    })

    it("csvParser western-macos-roman remote file encoding", async () => {
        const url = 'https://raw.githubusercontent.com/frictionlessdata/test-data/master/files/csv/encodings/western-macos-roman.csv'
        const file = await data.open(url)
        const rows = await toArray(await csvParser(file))
        assert.notDeepStrictEqual(rows[1], ['Réunion', 'ECS', '1989', '838462813'])
    })

    it("guessParseOptions for local data", async () => {
        const path_ = 'datajs/test/fixtures/semicolon-delimited.csv'
        let file = await data.open(path_)
        let parseOptions = await guessParseOptions(file)
        assert.deepStrictEqual(parseOptions.delimiter, ';')
    })

    it("guessParseOptions for local data", async () => {
        const url_ = 'https://raw.githubusercontent.com/frictionlessdata/test-data/master/files/csv/separators/semicolon.csv'
        let file = await data.open(url_)
        let parseOptions = await guessParseOptions(file)
        assert.deepStrictEqual(parseOptions.delimiter, ';')
    })
})
