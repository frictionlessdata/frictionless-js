import urljoin from 'url-join'
import fetch from 'node-fetch'
import { File, computeHash } from './file-base'
import { isUrl } from './data'
import { toNodeStream } from './browser-utils/index'
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

  stream({ size = 0 } = {}) {
    return (async () => {
      const res = await fetch(this.path)
      if (res.status === 200) {
        if (typeof window === 'undefined') {
          return res.body
        } else {
          return await toNodeStream(res.body.getReader(), size)
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

  /**
   * Calculates the hash of a file
   * @param {string} hashType - md5/sha256 type of hash algorithm to use
   */
  async hash(hashType = 'sha256', progress) {
    return computeHash(this.stream(), this.size, hashType, progress)
  }
}
