import { Readable } from 'stream'
import { ReadableWebToNodeStream } from 'readable-web-to-node-stream'

/**
 * Return node like stream from the browser
 * Transform browser's Reader to string, then create a nodejs stream from it
 * @param {object} stream A browser file stream
 * @param {number} size size of file to return
 */
export async function webToNodeStream(stream, size) {
  if (size === undefined || size === -1) {
    return new ReadableWebToNodeStream(stream)
  } else {
    const nodeStream = new Readable({
      read: {},
    })

    let lineCounter = 0
    let lastString = ''

    const decoder = new TextDecoder()
    let reader = stream.getReader()

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

    return nodeStream
  }
}

export function isFileFromBrowser(file) {
  return file instanceof File
}
