const stream = require('stream')
const Papa = require('papaparse')

/**
 * Return node like stream so that parsers work.
 * Transform browser's ReadableStream to string, then create a nodejs stream from it
 * @param {object} res
 * @param {number} size
 */
const toNodeStream = async (res, size) => {
  // if in browser, return node like stream so that parsers work
  // Running in browser:
  const nodeStream = new stream.Readable()

  const reader = res.body.getReader()

  let lineCounter = 0
  let lastString = ''
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()

    if (done || (lineCounter > size && size !== 0)) {
      reader.cancel()
      break
    }

    // Decode the current chunk to string and prepend the last string
    const string = `${lastString}${decoder.decode(value)}`

    // Extract lines from chunk
    const lines = string.split(/\r\n|[\r\n]/g)

    // Save last line, as it might be incomplete
    lastString = lines.pop() || ''

    for (const line of lines) {
      if (lineCounter === size) break
      // Write each string line to our nodejs stream
      nodeStream.push(line + '\r\n')
      lineCounter++
    }
  }

  nodeStream.push(null)
  return nodeStream
}

const isFileFromBrowser = (file) => {
  return file instanceof File
}

const readCSV = async (file) => {
  let data = []
  let numberOfRow = 0
  return new Promise((resolve) => {
    Papa.parse(file, {
      skipEmptyLines: true,
      worker: true,
      step: (row, parser) => {
        if (numberOfRow >= 100) {
          parser.abort()
        }
        numberOfRow = ++numberOfRow
        data = [...data, row.data]
      },
      error: function (err, file, inputElem, reason) {
        throw new Error('File to large.')
      },
      complete: () => {
        resolve(data)
      },
    })
  })
}

const readChunked = (file, chunkCallback, endCallback) => {
  let fileSize = file.size
  let chunkSize = 4 * 1024 * 1024 // 4MB
  let offset = 0

  let reader = new FileReader()
  reader.onload = function () {
    if (reader.error) {
      endCallback(reader.error || {})
      return
    }
    offset += reader.result.length
    // callback for handling read chunk
    // TODO: handle errors
    chunkCallback(reader.result, offset, fileSize)
    if (offset >= fileSize) {
      endCallback(null)
      return
    }
    readNext()
  }

  reader.onerror = function (err) {
    endCallback(err || {})
  }

  function readNext() {
    let fileSlice = file.slice(offset, offset + chunkSize)
    reader.readAsBinaryString(fileSlice)
  }
  readNext()
}

module.exports = {
  toNodeStream: toNodeStream,
  isFileFromBrowser: isFileFromBrowser,
  readCSV: readCSV,
  readChunked: readChunked,
}
