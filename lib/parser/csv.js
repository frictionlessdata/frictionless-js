const Readable = require('stream').Readable
const parse = require('csv-parse')
const CSVSniffer = require('csv-sniffer')()
const toString = require('stream-to-string')
const iconv = require('iconv-lite')

const csvParser = async (file, keyed = false) => {
  const parseOptions = await getParseOptions(file, keyed)
  let stream = await file.stream()
  if (!(typeof window === 'undefined')) {
    // Running in browser: transform browser's ReadableStream to string, then
    // create a nodejs stream from it:
    const s = new Readable
    // Create a transform stream with our transformer
    const ts = new TransformStream(new Uint8ArrayToStringsTransformer())
    // Apply our Transformer on the ReadableStream to create a stream of strings
    const lineStream = stream.pipeThrough(ts)
    // Read the stream of strings
    const reader = lineStream.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      // Write each string line to our nodejs stream
      s.push(value + '\r\n')
    }
    s.push(null)
    stream = s
  }
  if (file.descriptor.encoding.toLowerCase().replace('-', '') === 'utf8') {
    return stream.pipe(parse(parseOptions))
  } else { // non utf-8 files are decoded by iconv-lite module
    return stream.pipe(iconv.decodeStream(file.descriptor.encoding)).pipe(parse(parseOptions))
  }
}

const guessParseOptions = async (file) => {
  const possibleDelimiters = [',', ';', ':', '|', '\t', '^', '*', '&']
  const sniffer = new CSVSniffer(possibleDelimiters)
  let text = ''
  // We assume that reading first 1M bytes is enough to detect delimiter, line terminator etc.:
  if (file.descriptor.pathType === 'local') {
    const stream = await file.stream({end: 1000000})
    text = await toString(stream)
  } else if (file.descriptor.pathType === 'remote') {
    const stream = await file.stream()
    let bytes = 0
    // Check if it is running on nodejs or browser:
    if (typeof window === 'undefined') {
      // Running on nodejs
      await new Promise((resolve, reject) => {
        stream
          .on('data', (chunk) => {
            bytes += chunk.length
            if (bytes > 1000000) {
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
    } else {
      // Running in browser:
      // Create a transform stream with our transformer
      const ts = new TransformStream(new Uint8ArrayToStringsTransformer())
      // Apply our Transformer on the ReadableStream to create a stream of strings
      const lineStream = stream.pipeThrough(ts)
      // Read the stream of strings
      const reader = lineStream.getReader()
      while (Buffer.byteLength(text, 'utf8') < 1000000) {
        const { done, value } = await reader.read()
        if (done) {
          break
        }
        text += value + '\r\n'
      }
    }
  }
  const results = sniffer.sniff(text)
  return {
    delimiter: results.delimiter,
    quote: results.quoteChar || '"'
  }
}

const getParseOptions = async (file, keyed) => {
  let parseOptions = {
    columns: keyed ? true : null,
    ltrim: true
  }
  if (file.descriptor.dialect) {
    parseOptions.delimiter = file.descriptor.dialect.delimiter || ','
    parseOptions.rowDelimiter = file.descriptor.dialect.lineTerminator
    parseOptions.quote = file.descriptor.dialect.quoteChar || '"'
    if (file.descriptor.dialect.doubleQuote !== undefined && file.descriptor.dialect.doubleQuote === false) {
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
class Uint8ArrayToStringsTransformer {
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


module.exports = {
  csvParser,
  getParseOptions,
  guessParseOptions
}
