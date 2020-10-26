import { DEFAULT_ENCODING, PARSE_DATABASE, KNOWN_TABULAR_FORMAT } from './data'
import { infer } from 'tableschema'
import fs from 'fs'
import toArray from 'stream-to-array'
import { isPlainObject } from 'lodash'
import { guessParseOptions } from './parser/csv'
import {
  toNodeStream,
  getStream,
  computeHash,
} from './browser-utils/index'
import { open } from './data'


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

  get buffer() {
    return (async () => {
      const stream = await this.stream()
      const buffers = await toArray(stream)

      // eslint-disable-next-line no-undef
      return Buffer.concat(buffers)
    })()
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

  /**
   *
   * @param {string} cbProgress - Should be a callback to track the progress
   */
  async hash() {
    let stream = getStream(this.descriptor.stream())
    return computeHash(stream, this.size, 'md5')
  }

  /**
   *
   * @param {string} cbProgress - Should be a callback to track the progress
   */
  async hashSha256() {
    let stream = getStream(this.descriptor.stream())
    return computeHash(stream, this.size, 'sha256')
  }
}
