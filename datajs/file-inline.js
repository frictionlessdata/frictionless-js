import stream from 'stream'
import { File } from './file-base'
import { isString, isArray } from 'lodash'


export class FileInline extends File {
  constructor(descriptor, { basePath } = {}) {
    super(descriptor, { basePath })

    // JSON is special case ...
    if (isString(this.descriptor.data)) {
      // eslint-disable-next-line no-undef
      this._buffer = Buffer.from(this.descriptor.data)
    } else {
      // It is json/javascript
      // eslint-disable-next-line no-undef
      this._buffer = Buffer.from(JSON.stringify(this.descriptor.data))
    }
  }

  get displayName() {
    return 'FileInline'
  }

  // Not really sure this should exist here ... - have it for tests atm
  get path() {
    return this.descriptor.path
  }

  get size() {
    return this._buffer.byteLength
  }


  stream() {
    const bufferStream = new stream.PassThrough()
    bufferStream.end(this._buffer)
    return bufferStream
  }

  rows({ keyed } = {}) {
    if (isArray(this.descriptor.data)) {
      const rowStream = new stream.PassThrough({ objectMode: true })
      this.descriptor.data.forEach((row) => {
        rowStream.write(row)
      })
      rowStream.end()
      return rowStream
    }
    return this._rows({ keyed, size })
  }
}
