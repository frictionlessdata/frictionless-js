import chardet from 'chardet'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'

import { File } from './file-base'


export class FileLocal extends File {
    get displayName() {
      return 'FileLocal'
    }
  
    get path() {
      return this._basePath
        ? path.join(this._basePath, this.descriptor.path)
        : this.descriptor.path
    }
  
    stream({ end } = {}) {
      return fs.createReadStream(this.path, { start: 0, end })
    }
  
    get size() {
      return fs.statSync(this.path).size
    }
  
    get hash() {
      return crypto
        .createHash('md5')
        .update(fs.readFileSync(this.path))
        .digest('hex')
    }
  
    get encoding() {
      // When data is huge, we want to optimize performace (in tradeoff of less accuracy):
      // So we are using sample of first 100K bytes here:
      if (this.size > 1000000) {
        return chardet.detectFileSync(this.path, { sampleSize: 1000000 })
      }
      return chardet.detectFileSync(this.path)
    }
  }
  