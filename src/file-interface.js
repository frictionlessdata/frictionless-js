import { DEFAULT_ENCODING } from './data'
import { webToNodeStream } from './browser-utils/index'
import { File } from './file-base'

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
   * Return the stream to a file
   * If the size is -1 then will read whole file
   */
  async stream({ size } = {}) {
    return webToNodeStream(await this.descriptor.stream(), size)
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
