const toArray = require('stream-to-array')

describe('FileInterface', function () {
  it('addSchema()', async () => {
    const file = new data.open(
      new File(
        [
          `
number,string,boolean
1,two,true
3,four,false
            `,
        ],
        'sample.csv',
        { type: 'text/csv' }
      )
    )

    expect(file.descriptor.schema).toBe(undefined)
    await file.addSchema()
    headers = file.descriptor.schema.fields.map((field) => field.name)
    expect(headers).toEqual(['number', 'string', 'boolean'])
    expect(file.descriptor.schema.fields[1].type).toBe('string')
  })

  it('displayName, size and hash', async () => {
    const file = new data.open(
      new File(['some text'], 'test.txt', { type: 'text/plain' })
    )

    const hash = await file.hash()
    expect(hash).toBe('552e21cd4cd9918678e3c1a0df491bc3')
    expect(file.displayName).toBe('FileInterface')
    expect(file.size).toBe(9)
  })

  it('rows()', async () => {
    const file = new data.open(
      new File(
        [
          `
number,string,boolean
1,two,true
3,four,false
            `,
        ],
        'sample.csv',
        { type: 'text/csv' }
      )
    )

    const rowStream = await file.rows()
    const rows = await toArray(rowStream)
    expect(rows[0]).toEqual(['number', 'string', 'boolean'])
    expect(rows[1]).toEqual(['1', 'two', 'true'])
  })
})
