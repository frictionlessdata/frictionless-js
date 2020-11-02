import { DEFAULT_ENCODING, PARSE_DATABASE, KNOWN_TABULAR_FORMAT } from './data'
import { infer } from 'tableschema'
import toArray from 'stream-to-array'
import { isPlainObject } from 'lodash'
import { guessParseOptions } from './parser/csv'
import { toNodeStream, webToNodeStream } from './browser-utils/index'
import { open } from './data'
const { Transform } = require('stream')
import crypto from 'crypto'

/**
 * Abstract Base instance of File
 */
export class File {
  /**
   * @deprecated Use "open" instead
   * 2019-02-05 kept for backwards compatibility
   */
  static load(pathOrDescriptor, { basePath, format } = {}) {
    console.warn(
      "WARNING! Depreciated function called. Function 'load' has been deprecated, please use the 'open' function instead!"
    )
    return open(pathOrDescriptor, { basePath, format })
  }

  constructor(descriptor, { basePath } = {}) {
    this._descriptor = descriptor
    this._basePath = basePath
    this._descriptor.encoding = this.encoding || DEFAULT_ENCODING
  }

  get descriptor() {
    return this._descriptor
  }

  get path() {
    throw new Error(
      'This is an abstract base class which you should not instantiate. Use open() instead'
    )
  }

  stream() {
    return null
  }

  /**
   * Return file buffer in chunks
   * @param {func} getChunk Callback function that returns current chunk and percent of progress
   *
   * Example Usage:
   *
   *  await file.bufferInChunks((buf, percent)=>{
   *         console.log("contentBuffer :", buf);
   *         console.log("Progress :", percent);
   *    })
   *
   */
  async bufferInChunks(getChunk) {
    let stream = null

    if (this.displayName == 'FileInterface') {
      stream = webToNodeStream(this.descriptor.stream())
    } else {
      stream = await this.stream()
    }

    let offset = 0
    let totalChunkSize = 0
    let chunkCount = 0
    let fileSize = this.size
    var percent = 0

    //calculates and sets the progress after every 100th chunk
    const _reportProgress = new Transform({
      transform(chunk, encoding, callback) {
        if (chunkCount % 100 == 0) {
          const runningTotal = totalChunkSize + offset
          const percentComplete = Math.round((runningTotal / fileSize) * 100)
          percent = percentComplete
        }
        callback(null, chunk)
      },
    })

    stream
      .pipe(_reportProgress)
      .on('data', function (chunk) {
        offset += chunk.length
        chunkCount += 1

        let buffer = new Buffer.from(chunk)
        getChunk(buffer, percent)
      })
      // .on('end', function () {
      //   getChunk(null, 100)
      // })
      .on('error', function (err) {
        throw new Error(err)
      })
  }

  /**
   * Returns file buffer
   */
  get buffer() {
    return (async () => {
      const stream = await this.stream()
      const buffers = await toArray(stream)

      // eslint-disable-next-line no-undef
      return Buffer.concat(buffers)
    })()
  }

  /**
   * Calculates the hash of a file
   * @param {string} hashType - md5/sha256 type of hash algorithm to use
   * @param {func} progress - Callback that returns current progress
   * @returns {string} hash of file
   */
  async hash(hashType = 'md5', progress) {
    let displayName = this.displayName
    let stream = null

    switch (displayName) {
      case 'FileInterface':
        stream = webToNodeStream(this.descriptor.stream())
        break
      case 'FileInline':
        return crypto.createHash('md5').update(this._buffer).digest('hex')
      default:
        stream = this.stream()
        break
    }
    return computeHash(stream, this.size, hashType, progress)
  }

  rows({ keyed, sheet, size } = {}) {
    return this._rows({ keyed, sheet, size })
  }

  _rows({ keyed, sheet, size } = {}) {
    if (this.descriptor.format in PARSE_DATABASE) {
      const parser = PARSE_DATABASE[this.descriptor.format]
      return parser(this, { keyed, sheet, size })
    }
    throw new Error(
      `We do not have a parser for that format: ${this.descriptor.format}`
    )
  }

  async addSchema() {
    if (this.displayName === 'FileInline') {
      this.descriptor.schema = await infer(this.descriptor.data)
      return
    }

    // Try to infer schema from sample data if given file is xlsx
    if (this.descriptor.format === 'xlsx' && this.descriptor.sample) {
      let headers = 1
      if (isPlainObject(this.descriptor.sample[0])) {
        headers = Object.keys(this.descriptor.sample[0])
      }
      this.descriptor.schema = await infer(this.descriptor.sample, { headers })
      return
    }

    // Ensure file is tabular
    if (KNOWN_TABULAR_FORMAT.indexOf(this.descriptor.format) === -1) {
      throw new Error('File is not in known tabular format.')
    }

    // Get parserOptions so we can use it when "infering" schema:
    const parserOptions = await guessParseOptions(this)
    // We also need to include parserOptions in "dialect" property of descriptor:
    this.descriptor.dialect = {
      delimiter: parserOptions.delimiter,
      quoteChar: parserOptions.quote,
    }
    // Now let's get a stream from file and infer schema:
    let thisFileStream = await this.stream({ size: 100 })
    this.descriptor.schema = await infer(thisFileStream, parserOptions)
  }
}

export class FileInterface extends File {
  constructor(descriptor, { basePath } = {}) {
    super(descriptor, { basePath })
    this._descriptor.format = descriptor.name.split('.').pop() || ''
  }

  get displayName() {
    return 'FileInterface'
  }

  // create and return a path url
  get path() {
    return URL.createObjectURL(this.descriptor)
  }

  get encoding() {
    return this._encoding || DEFAULT_ENCODING
  }

  /**
   *
   * If the size is -1 then will read whole file
   */
  stream({ size } = {}) {
    size = size === -1 ? this.size : size || 0
    return toNodeStream(this.descriptor.stream().getReader(), size)
  }

  get buffer() {
    return this.descriptor.arrayBuffer()
  }

  get size() {
    return this.descriptor.size
  }

  get fileName() {
    return this.descriptor.name
  }
}

/**
 * Computes the streaming hash of a file
 * @param {Readerable Stream} fileStream A node like stream
 * @param {number} fileSize Total size of the file
 * @param {string} algorithm sha256/md5 hashing algorithm to use
 * @param {func} progress Callback function with progress
 */
export function computeHash(fileStream, fileSize, algorithm, progress) {
  return new Promise((resolve, reject) => {
    let hash = crypto.createHash(algorithm)
    let offset = 0
    let totalChunkSize = 0
    let chunkCount = 0

    //calculates progress after every 20th chunk
    const _reportProgress = new Transform({
      transform(chunk, encoding, callback) {
        if (chunkCount % 20 == 0) {
          const runningTotal = totalChunkSize + offset
          const percentComplete = Math.round((runningTotal / fileSize) * 100)
          if (typeof progress === 'function') {
            progress(percentComplete) //callback with progress
          }
        }
        callback(null, chunk)
      },
    })

    fileStream
      .pipe(_reportProgress)
      .on('error', function (err) {
        reject(err)
      })
      .on('data', function (chunk) {
        offset += chunk.length
        chunkCount += 1
        hash.update(chunk)
      })
      .on('end', function () {
        hash = hash.digest('hex')
        if (typeof progress === 'function') {
          progress(100)
        }
        resolve(hash)
      })
  })
}
