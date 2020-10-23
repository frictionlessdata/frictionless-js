import chardet from 'chardet'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import { File } from './file-base'
const { Transform } = require('stream')

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

  get encoding() {
    // When data is huge, we want to optimize performace (in tradeoff of less accuracy):
    // So we are using sample of first 100K bytes here:
    if (this.size > 1000000) {
      return chardet.detectFileSync(this.path, { sampleSize: 1000000 })
    }
    return chardet.detectFileSync(this.path)
  }

  /**
   * Calculates the md5 hash of a file
   * @param {string} cbProgress - Should be a callback to track the progress
   */
  async hash(done) {
    return this._computeHash(this.path, 'md5', done)
  }

  /**
   * Calculates the Sha256 hash of a file
   * @param {string} cbProgress - Should be a callback to track the progress
   */
  async hashSha256(done) {
    return this._computeHash(this.path, 'sha256', done)
  }


  /**
   * Computes the streaming hash of a file
   * @param {string} filePath path to file
   * @param {string} algorithm sha256/md5 hashing algorithm to use
   * @param {func} done Callback function to call after calculating full hash
   */
  _computeHash(filePath, algorithm, done) {
    let hash = crypto.createHash(algorithm)
    let fileSize = this.size
    let offset = 0
    let chunkSize = 4 * 1024 * 1024 //4mb

    let fileStream = fs.createReadStream(filePath, {
      start: 0,
      highWaterMark: chunkSize,
    })

    //calculates and displays progress after every chunk
    const _reportProgress = new Transform({
      transform(chunk, encoding, callback) {
        let progress = ((offset / fileSize) * 100).toFixed()
        process.stdout.write('\r')
        process.stdout.write(`Hashing in progress: ...${progress}/100`)
        callback(null, chunk)
      },
    })
    
    fileStream
      .pipe(_reportProgress)
      .on('error', function (err) {
        throw err
      })
      .on('data', function (chunk) {
        offset += chunkSize
        hash.update(chunk)
      })
      .on('end', function () {
        hash = hash.digest('hex')
        process.stdout.write('\n')
        return done(hash)
      })
  }
}
