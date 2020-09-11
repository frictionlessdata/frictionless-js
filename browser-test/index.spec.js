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
    expect(file.descriptor.schema.fields[1].type).toBe('string')
  })

  it('displayName, size and hash', async () => {
    const file = new data.open(genFile())

    const hash = await file.hash()
    const hashSha256 = await file.hashSha256()
    expect(hash).toBe('sGYdlWZJioAPv5U2XOKHRw==')
    expect(hashSha256).toBe('2dR7kKyWB8URH/moOqN7wQ4FjOYgbAC2YmreCReE4Jg=')
    expect(file.displayName).toBe('FileInterface')
    expect(file.size).toBe(46)
  })

  it('rows()', async () => {
    debugger
    const file = new data.open(genFile())

    const rowStream = await file.rows({ size: -1 })
    const rows = await toArray(rowStream)
    expect(rows[0]).toEqual(['number', 'string', 'boolean'])
    expect(rows[1]).toEqual(['1', 'two', 'true'])
  })
})
