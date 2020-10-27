import { Readable } from 'stream'
import { ReadableWebToNodeStream } from 'readable-web-to-node-stream'
const { Transform } = require('stream')
import crypto from 'crypto'

/**
 * Return node like stream so that parsers work.
 * Transform browser's Reader to string, then create a nodejs stream from it
 * @param {object} reader A file stream reader from the browser input
 * @param {number} size Size of data to return
 * @param {boolean} return_chunk whether to return a chunk in string format or a node stream
 */
export async function toNodeStream(reader, size, returnChunk = false) {
  // if in browser, return node like stream so that parsers work
  // Running in browser:
  const nodeStream = new Readable()

  let lineCounter = 0
  let lastString = ''
  let chunkText = ''

  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()

    if (done || (lineCounter > size && size !== 0)) {
      reader.cancel()
      break
    }

    // Decode the current chunk to string and prepend the last string
    const string = `${lastString}${decoder.decode(value)}`

    chunkText += string

    // Extract lines from chunk
    const lines = string.split(/\r\n|[\r\n]/g)

    // Save last line, as it might be incomplete
    lastString = lines.pop() || ''

    for (const line of lines) {
      if (lineCounter === size) {
        reader.cancel()
        break
      }
      // Write each string line to our nodejs stream
      nodeStream.push(line + '\r\n')
      lineCounter++
    }
  }

  nodeStream.push(null)

  //return a chunk of the file. Chunk is used when parsing large files in CSV modeule
  if (returnChunk) {
    return chunkText
  }

  return nodeStream
}


export function isFileFromBrowser(file) {
  return file instanceof File
}

/**
 * Return node like stream
 * @param {object} reader A file stream reader from the browser input
 */
export function webToNodeStream(reader) {
  const stream = new ReadableWebToNodeStream(reader)
  return stream
}

/**
 * Computes the streaming hash of a file
 * @param {Readerable Stream} fileStream A node like stream
 * @param {number} fileSize Total size of the file
 * @param {string} algorithm sha256/md5 hashing algorithm to use
 */
export function computeHash(fileStream, fileSize, algorithm) {
  return new Promise((resolve, reject) => {
    let hash = crypto.createHash(algorithm)
    let offset = 0
    let totalChunkSize = 0
    let chunkCount = 0

    //calculates and displays progress after every 20th chunk
    const _reportProgress = new Transform({
      transform(chunk, encoding, callback) {
        if (chunkCount % 20 == 0) {
          const runningTotal = totalChunkSize + offset
          const percentComplete = Math.round((runningTotal / fileSize) * 100)
          console.log(`Hashing progress: ...${percentComplete}%`)
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
        console.log(`Hashing progress: ...100%`)
        resolve(hash)
      })
  })
}
