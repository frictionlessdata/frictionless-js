import urljoin from 'url-join'
import fetch from 'node-fetch'
import { File } from './file-base'
import { isUrl } from './data'
import { webToNodeStream } from './browser-utils/index'
import { DEFAULT_ENCODING } from './data'

export class FileRemote extends File {
  get displayName() {
    return 'FileRemote'
  }

  get path() {
    const isItUrl = isUrl(this.descriptor.path)
    if (isItUrl) {
      return this.descriptor.path
    } else {
      return this._basePath
        ? urljoin(this._basePath, this.descriptor.path)
        : this.descriptor.path
    }
  }

  get browserBuffer() {
    return (async () => {
      const res = await fetch(this.path)
      return await res.arrayBuffer()
    })()
  }

  stream({ size } = {}) {
    return (async () => {
      const res = await fetch(this.path)
      if (res.status === 200) {
        if (typeof window === 'undefined') {
          return res.body
        } else {
          return webToNodeStream(res.body, size)
        }
      } else {
        throw new Error(
          `${res.status}: ${res.statusText}. Requested URL: ${this.path}`
        )
      }
    })()
  }

  get encoding() {
    return this._encoding || DEFAULT_ENCODING
  }
}
