// @vitest-environment node
import { lyla, createLyla, LylaResponse, isLylaError, LYLA_ERROR } from 'lyla'
import { ClientRequest } from 'node:http'
import { describe, expect, it } from 'vitest'

describe('node basic', () => {
  it.each([
    ['default', lyla],
    ['created', createLyla({ createContext: () => undefined }).lyla]
  ] as const)('wraps node details for the %s instance', async (_, request) => {
    let originalRequest: unknown
    const response = await request.get('http://localhost:8091/api/get-text', {
      hooks: { onHeadersReceived: [({ originalRequest: value }) => {
        originalRequest = value
      }] }
    })
    expect(response.detail).toEqual({ adapter: 'node', value: null })
    expect(originalRequest).toEqual({ adapter: 'node', value: expect.any(ClientRequest) })
  })

  it.each([
    ['default', lyla],
    ['created', createLyla({ createContext: () => undefined }).lyla]
  ] as const)('preserves native network errors for the %s instance', async (_, request) => {
    const error = await request.get('http://127.0.0.1:0/').catch((error) => error)
    expect(error).toMatchObject({
      type: LYLA_ERROR.NETWORK,
      error: expect.any(Error),
      detail: { adapter: 'node', value: expect.any(Error) }
    })
    expect(error.detail.value).toBe(error.error)
  })

  it('/api/get-text', async () => {
    const resp = await lyla.get('http://localhost:8091/api/get-text')
    expect(resp.status).toBe(200)
    expect(resp.body).toBe('hello world')
  })

  it('/api/get-json', async () => {
    const resp = await lyla.get('http://localhost:8091/api/get-json')
    expect(resp.status).toBe(200)
    expect(resp.json).toStrictEqual({
      key: 'value'
    })
  })

  it('/api/get-return-headers', async () => {
    const resp = await lyla.get(
      'http://localhost:8091/api/get-return-headers',
      {
        headers: {
          foo: 'bar',
          'foo-baz': 'baz'
        }
      }
    )
    expect(resp.headers['foo']).toBe('bar')
    expect(resp.headers['foo-baz']).toBe('baz')
  })

  it('/api/get-set-cookie', async () => {
    const resp = await lyla.get('http://localhost:8091/api/get-set-cookie', {})
    expect(resp.headers['set-cookie']).toBe('foo-get=bar')
    expect(resp.headers['x-cors']).toBe('amazing')
  })

  it('/api/get-headers', async () => {
    const resp = await lyla.get('http://localhost:8091/api/get-headers')
    expect(resp.headers['x-upper']).toBe('X-UPPER')
    expect(resp.headers['x-lower']).toBe('x-lower')
  })

  it('/api/post-text', async () => {
    const resp = await lyla.post('http://localhost:8091/api/post-text')
    expect(resp.status).toBe(200)
    expect(resp.body).toBe('hello world')
  })

  it('/api/post-json', async () => {
    const resp = await lyla.post('http://localhost:8091/api/post-json')
    expect(resp.status).toBe(200)
    expect(resp.json).toStrictEqual({
      key: 'value'
    })
  })

  it('/api/post-return-headers', async () => {
    const resp = await lyla.post(
      'http://localhost:8091/api/post-return-headers',
      {
        headers: {
          foo: 'bar',
          'foo-baz': 'baz'
        }
      }
    )
    expect(resp.headers['foo']).toBe('bar')
    expect(resp.headers['foo-baz']).toBe('baz')
  })

  it('/api/post-return-body', async () => {
    const resp = await lyla.post('http://localhost:8091/api/post-return-body', {
      json: {
        foo: 'bar'
      }
    })
    expect(resp.json).toStrictEqual({ foo: 'bar' })
  })

  it('/api/error', async () => {
    let resp: LylaResponse | null = null
    let error: Error | null = null
    try {
      resp = await lyla.post('http://localhost:8091/api/error')
    } catch (e) {
      error = e as Error
      expect(isLylaError(e)).toBe(true)
      if (isLylaError(e)) {
        expect(e.type === LYLA_ERROR.HTTP).toBe(true)
        if (e.type === LYLA_ERROR.HTTP) {
          expect(e.response.status).toBe(500)
        }
      }
    }
    expect(error).not.toBe(null)
  })
})

describe('node progress', () => {
  it.each([
    ['default', lyla],
    ['created', createLyla({ createContext: () => undefined }).lyla]
  ] as const)('tags native progress values for the %s instance', async (_, request) => {
    const events: Array<{ detail: unknown; originalRequest: unknown }> = []
    const record = (event: { detail: unknown; originalRequest: unknown }) => events.push(event)
    await request.post('http://localhost:8091/api/post-return-body', {
      body: 'body',
      onUploadProgress: record,
      onDownloadProgress: record
    })
    expect(events.length).toBeGreaterThanOrEqual(2)
    for (const event of events) {
      expect(event.detail).toEqual({ adapter: 'node', value: null })
      expect(event.originalRequest).toEqual({ adapter: 'node', value: expect.any(ClientRequest) })
    }
  })

  it('text `uploadProgress` & `downloadProgress`', async () => {
    const up: number[] = []
    const dp: number[] = []
    await lyla.post('http://localhost:8091/api/post-return-body', {
      responseType: 'text',
      body: Array(2000000).fill('xxxx').join(''),
      onUploadProgress(e) {
        up.push(e.percent)
      },
      onDownloadProgress(e) {
        dp.push(e.percent)
      }
    })
    expect(up.length > 3).toBe(true)
    expect(dp.length > 3).toBe(true)
  })

  it('buffer `uploadProgress` & `downloadProgress`', async () => {
    const up: number[] = []
    const dp: number[] = []
    await lyla.post('http://localhost:8091/api/post-return-body', {
      responseType: 'text',
      body: Buffer.from(Array(2000000).fill('xxxx').join('')),
      onUploadProgress(e) {
        up.push(e.percent)
      },
      onDownloadProgress(e) {
        dp.push(e.percent)
      }
    })
    expect(up.length > 3).toBe(true)
    expect(dp.length > 3).toBe(true)
  })
})
