import parse from 'csv-parse'
const CSVSniffer = require('csv-sniffer')()
import toString from 'stream-to-string'
import { decodeStream } from 'iconv-lite'

export async function csvParser(file, { keyed = false, size } = {}) {
  const parseOptions = await getParseOptions(file, keyed)
  let stream = await file.stream({size})
  if (file.descriptor.encoding.toLowerCase().replace('-', '') === 'utf8') {
    return stream.pipe(parse(parseOptions))
  } else {
    // non utf-8 files are decoded by iconv-lite module
    return stream
      .pipe(decodeStream(file.descriptor.encoding))
      .pipe(parse(parseOptions))
  }
}

export async function guessParseOptions(file) {
  const possibleDelimiters = [',', ';', ':', '|', '\t', '^', '*', '&']
  const sniffer = new CSVSniffer(possibleDelimiters)
  let text = ''

  // We assume that reading first 50K bytes is enough to detect delimiter, line terminator etc.:
  if (file.displayName === 'FileLocal') {
    const stream = await file.stream({ size: 50000 })
    text = await toString(stream)
  } else if (file.displayName === 'FileInterface') {
    let stream = await file.stream({size: 10})
    text = await toString(stream)
  } else if (file.displayName === 'FileRemote') {
    const stream = await file.stream({ size: 100 })
    let bytes = 0

    await new Promise((resolve, reject) => {
      stream
        .on('data', (chunk) => {
          bytes += chunk.length
          if (bytes > 50000) {
            stream.pause()
            resolve()
          } else {
            text += chunk.toString()
          }
        })
        .on('end', () => {
          resolve()
        })
    })
  }

  const results = sniffer.sniff(text)

  return {
    delimiter: results.delimiter,
    quote: results.quoteChar || '"',
  }
}

export async function getParseOptions(file, keyed) {
  let parseOptions = {
    columns: keyed ? true : null,
    ltrim: true,
  }

  if (file.descriptor.dialect) {
    parseOptions.delimiter = file.descriptor.dialect.delimiter || ','
    parseOptions.rowDelimiter = file.descriptor.dialect.lineTerminator
    parseOptions.quote = file.descriptor.dialect.quoteChar || '"'

    if (
      file.descriptor.dialect.doubleQuote !== undefined &&
      file.descriptor.dialect.doubleQuote === false
    ) {
      parseOptions.escape = ''
    }
  } else {
    const guessedParseOptions = await guessParseOptions(file)
    // Merge guessed parse options with default one:
    parseOptions = Object.assign(parseOptions, guessedParseOptions)
  }

  return parseOptions
}

/**
 * This transformer takes binary Uint8Array chunks from a `fetch`
 * and translates them to chunks of strings.
 *
 * @implements {TransformStreamTransformer}
 */
export class Uint8ArrayToStringsTransformer {
  constructor() {
    this.decoder = new TextDecoder()
    this.lastString = ''
  }

  /**
   * Receives the next Uint8Array chunk from `fetch` and transforms it.
   *
   * @param {Uint8Array} chunk The next binary data chunk.
   * @param {TransformStreamDefaultController} controller The controller to enqueue the transformed chunks to.
   */
  transform(chunk, controller) {
    // Decode the current chunk to string and prepend the last string
    const string = `${this.lastString}${this.decoder.decode(chunk)}`

    // Extract lines from chunk
    const lines = string.split(/\r\n|[\r\n]/g)

    // Save last line, as it might be incomplete
    this.lastString = lines.pop() || ''

    // Enqueue each line in the next chunk
    for (const line of lines) {
      controller.enqueue(line)
    }
  }

  /**
   * Is called when `fetch` has finished writing to this transform stream.
   *
   * @param {TransformStreamDefaultController} controller The controller to enqueue the transformed chunks to.
   */
  flush(controller) {
    // Is there still a line left? Enqueue it
    if (this.lastString) {
      controller.enqueue(this.lastString)
    }
  }
}
