const toArray = require('stream-to-array')

const genFile = () => {
  return new File(
    [
      `number,string,boolean
1,two,true
3,four,false
`,
    ],
    'sample.csv',
    { type: 'text/csv' }
  )
}

describe('FileInterface', function () {
  it('addSchema()', async () => {
    const file = new data.open(genFile())

    expect(file.descriptor.schema).toBe(undefined)
    await file.addSchema()
    headers = file.descriptor.schema.fields.map((field) => field.name)
    expect(headers).toEqual(['number', 'string', 'boolean'])
    expect(file.descriptor.schema.fields[1]['type']).toBe('string')
  })

  it('displayName, size and hash', async () => {
    const file = new data.open(genFile())

    const hash = await file.hash('md5')
    const hashSha256 = await file.hash('sha256')
    expect(hash).toBe('b0661d9566498a800fbf95365ce28747')
    expect(hashSha256).toBe(
      'd9d47b90ac9607c5111ff9a83aa37bc10e058ce6206c00b6626ade091784e098'
    )
    expect(file.displayName).toBe('FileInterface')
    expect(file.size).toBe(46)
  })

  it('rows()', async () => {
    const file = new data.open(genFile())

    let rowStream = await file.rows({ size: -1 })
    let rows = await toArray(rowStream)
    expect(rows[0]).toEqual(['number', 'string', 'boolean'])
    expect(rows[1]).toEqual(['1', 'two', 'true'])

    rowStream = await file.rows({ size: 1 })
    rows = await toArray(rowStream)
    expect(rows[0]).toEqual(['number', 'string', 'boolean'])
    expect(rows[1]).toEqual(undefined)
  })

  it('stream()', async () => {
    const file = new data.open(genFile())

    // Test stream
    const stream = await file.stream({ size: -1 })
    const out = await toArray(stream)
    expect(out.toString().indexOf('number,string,boolean')).toBeGreaterThan(-1)
  })

  it('buffer()', async () => {
    const file = new data.open(genFile())
    const buffer = await file.buffer
    const text = new TextDecoder('utf-8').decode(buffer)
    expect(text.slice(0, 21)).toBe('number,string,boolean')
  })
})
