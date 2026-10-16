// @vitest-environment node
import { createLyla, LylaAbortController, LYLA_ERROR } from '@lylajs/core'
import type { LylaError, LylaRequestOptionsWithContext } from '@lylajs/core'
import { describe, expect, it } from 'vitest'
import { catchError, createFakeAdapter, respond, sleep } from './utils'

describe('core request options', () => {
  it('normalizes request options before passing them to the adapter', async () => {
    const { adapter, requests } = createFakeAdapter()
    const { lyla } = createLyla(adapter, {
      createContext: () => undefined,
      baseUrl: 'https://api.test/v1/'
    })
    await lyla.post('/users', {
      query: { a: 1, b: [true, 'x'], c: null, d: undefined, e: '' },
      json: { name: 'lyla' },
      extraOptions: { foo: 'bar' }
    })
    expect(requests).toHaveLength(1)
    expect(requests[0]).toMatchObject({
      url: 'https://api.test/v1/users?a=1&b=true&b=x&e=',
      method: 'POST',
      body: '{"name":"lyla"}',
      json: { name: 'lyla' },
      responseType: 'text',
      withCredentials: false,
      extraOptions: { foo: 'bar' },
      onUploadProgress: undefined,
      onDownloadProgress: undefined,
      onHeadersReceived: undefined
    })
    expect(requests[0].headers).toEqual({
      'content-type': 'application/json',
      accept: '*/*'
    })
  })

  it('defaults method to GET', async () => {
    const { adapter, requests } = createFakeAdapter()
    const { lyla } = createLyla(adapter, { createContext: () => undefined })
    await lyla({ url: '/' })
    expect(requests[0].method).toBe('GET')
  })

  it('rejects GET request with body when method is omitted', async () => {
    const { adapter, requests } = createFakeAdapter()
    const { lyla } = createLyla(adapter, { createContext: () => undefined })
    const error = await catchError(lyla({ url: '/', body: 'body' }))
    expect((error as LylaError).type).toBe(LYLA_ERROR.BAD_REQUEST)
    expect(requests).toHaveLength(0)
  })

  it('sends GET request with body when `allowGetBody` is true', async () => {
    const { adapter, requests } = createFakeAdapter()
    const { lyla } = createLyla(adapter, { createContext: () => undefined })
    await lyla.get('/', { body: 'body', allowGetBody: true })
    expect(requests[0]).toMatchObject({ method: 'GET', body: 'body' })
  })

  it('passes other options to the adapter', async () => {
    const { adapter, requests } = createFakeAdapter()
    const { lyla } = createLyla(adapter, {
      createContext: () => undefined,
      withCredentials: true
    })
    await lyla.put('/', { body: 'raw', responseType: 'arraybuffer' })
    expect(requests[0]).toMatchObject({
      method: 'PUT',
      body: 'raw',
      json: undefined,
      responseType: 'arraybuffer',
      withCredentials: true
    })
    expect(requests[0].headers).toEqual({ accept: '*/*' })
  })

  it('merges responseType of instance, overrides and request', async () => {
    const { adapter, requests } = createFakeAdapter()
    const { lyla } = createLyla(
      adapter,
      { createContext: () => undefined, responseType: 'arraybuffer' },
      { responseType: 'blob' }
    )
    await lyla.get('/')
    await lyla.get('/', { responseType: 'text' })
    expect(requests.map((request) => request.responseType)).toEqual([
      'blob',
      'text'
    ])
  })

  it('uses responseType modified by `onInit`', async () => {
    const { adapter, requests } = createFakeAdapter()
    const { lyla } = createLyla(adapter, {
      createContext: () => undefined,
      hooks: {
        onInit: [(options) => ({ ...options, responseType: 'arraybuffer' })]
      }
    })
    await lyla.get('/')
    expect(requests[0].responseType).toBe('arraybuffer')
  })

  it.each([
    ['https://a.test/', '/b', 'https://a.test/b'],
    ['https://a.test', 'b', 'https://a.test/b'],
    ['https://a.test///', 'b', 'https://a.test/b'],
    ['https://a.test/base', '', 'https://a.test/base'],
    ['https://a.test', 'http://other.test/b', 'http://other.test/b'],
    ['https://a.test', '//other.test/b', '//other.test/b']
  ])('merges baseUrl %s with url %s', async (baseUrl, url, expected) => {
    const { adapter, requests } = createFakeAdapter()
    const { lyla } = createLyla(adapter, { createContext: () => undefined })
    await lyla({ baseUrl, url })
    expect(requests[0].url).toBe(expected)
  })

  it('merges query of instance and request', async () => {
    const { adapter, requests } = createFakeAdapter()
    const { lyla } = createLyla(adapter, {
      createContext: () => undefined,
      query: { a: 1, b: 2 }
    })
    await lyla.get('/', { query: { b: undefined, c: 'x y' } })
    expect(requests[0].url).toBe('/?a=1&c=x+y')
  })

  it("doesn't append `?` when query is empty", async () => {
    const { adapter, requests } = createFakeAdapter()
    const { lyla } = createLyla(adapter, { createContext: () => undefined })
    await lyla.get('/', { query: { a: undefined, b: null, c: [] } })
    expect(requests[0].url).toBe('/')
  })

  it('serializes falsy json values', async () => {
    const { adapter, requests } = createFakeAdapter()
    const { lyla } = createLyla(adapter, { createContext: () => undefined })
    await lyla.post('/', { json: null })
    await lyla.post('/', { json: 0 })
    await lyla.post('/', { json: false })
    expect(requests.map((request) => request.body)).toEqual([
      'null',
      '0',
      'false'
    ])
  })
})

describe('core request headers', () => {
  it('merges headers of instance, overrides and request in lower case', async () => {
    const { adapter, requests } = createFakeAdapter()
    const { lyla } = createLyla(
      adapter,
      {
        createContext: () => undefined,
        headers: { 'X-Instance': 'instance', 'X-Shared': 'instance' }
      },
      {
        headers: { 'X-Override': 1, 'X-Shared': 'override' }
      }
    )
    await lyla.get('/', {
      headers: { 'x-shared': 'request', Accept: 'application/json' }
    })
    expect(requests[0].headers).toEqual({
      'x-instance': 'instance',
      'x-override': '1',
      'x-shared': 'request',
      accept: 'application/json'
    })
  })

  it.each([
    ['X-Removed', 'X-Removed'],
    ['X-Removed', 'x-removed'],
    ['x-removed', 'X-REMOVED']
  ])(
    'removes header %s of instance by setting %s to undefined',
    async (instanceKey, requestKey) => {
      const { adapter, requests } = createFakeAdapter()
      const { lyla } = createLyla(adapter, {
        createContext: () => undefined,
        headers: { [instanceKey]: 'instance', 'X-Kept': 'kept' }
      })
      await lyla.get('/', { headers: { [requestKey]: undefined } })
      expect(requests[0].headers).toEqual({ 'x-kept': 'kept', accept: '*/*' })
    }
  )

  it("doesn't override `content-type` set by user when using json", async () => {
    const { adapter, requests } = createFakeAdapter()
    const { lyla } = createLyla(adapter, { createContext: () => undefined })
    await lyla.post('/', {
      json: {},
      headers: { 'Content-Type': 'application/vnd.api+json' }
    })
    expect(requests[0].headers['content-type']).toBe(
      'application/vnd.api+json'
    )
  })

  it('uses headers modified by `onBeforeRequest`', async () => {
    const { adapter, requests } = createFakeAdapter()
    const { lyla } = createLyla(adapter, {
      createContext: () => undefined,
      headers: { 'X-Instance': 'instance' },
      hooks: {
        onBeforeRequest: [
          (options) => ({
            ...options,
            headers: {
              ...options.headers,
              'X-Instance': 'modified',
              'X-Before-Request': 'added'
            }
          })
        ]
      }
    })
    await lyla.get('/')
    expect(requests[0].headers).toEqual({
      'x-instance': 'modified',
      'x-before-request': 'added',
      accept: '*/*'
    })
  })
})

describe('core request shortcuts', () => {
  it.each([
    'get',
    'post',
    'put',
    'patch',
    'head',
    'delete',
    'options',
    'trace',
    'connect'
  ] as const)('`lyla.%s` sends request with uppercase method', async (method) => {
    const { adapter, requests } = createFakeAdapter()
    const { lyla } = createLyla(adapter, { createContext: () => undefined })
    await lyla[method]('/path', { query: { a: 1 } })
    expect(requests[0]).toMatchObject({
      method: method.toUpperCase(),
      url: '/path?a=1'
    })
  })

  it('shortcut url and method take precedence over options', async () => {
    const { adapter, requests } = createFakeAdapter()
    const { lyla } = createLyla(adapter, { createContext: () => undefined })
    await lyla.post('/shortcut', { url: '/options', method: 'put' } as any)
    expect(requests[0]).toMatchObject({ method: 'POST', url: '/shortcut' })
  })
})

describe('core response', () => {
  it('resolves response from adapter', async () => {
    const { adapter } = createFakeAdapter((request) => {
      setTimeout(() =>
        respond(request, {
          status: 201,
          headers: { 'X-Response': 'value' },
          body: '{"id":1}'
        })
      )
    })
    const { lyla } = createLyla(adapter, { createContext: () => ({ id: 1 }) })
    const response = await lyla.post<{ id: number }>('/users', {
      json: { name: 'lyla' }
    })
    expect(response.status).toBe(201)
    expect(response.statusText).toBe('Created')
    expect(response.headers).toEqual({ 'x-response': 'value' })
    expect(response.body).toBe('{"id":1}')
    expect(response.detail).toBe('response detail')
    expect(response.context).toEqual({ id: 1 })
    expect(response.requestOptions).toMatchObject({
      url: '/users',
      method: 'POST',
      body: '{"name":"lyla"}'
    })
    expect(response.json).toEqual({ id: 1 })
  })

  it.each([200, 204, 299])('resolves response with status %i', async (status) => {
    const { adapter } = createFakeAdapter((request) => {
      setTimeout(() => respond(request, { status }))
    })
    const { lyla } = createLyla(adapter, { createContext: () => undefined })
    await expect(lyla.get('/')).resolves.toMatchObject({ status })
  })

  it('caches parsed json and allows overriding it', async () => {
    const { adapter } = createFakeAdapter((request) => {
      setTimeout(() => respond(request, { body: '{"a":{"b":1}}' }))
    })
    const { lyla } = createLyla(adapter, { createContext: () => undefined })
    const response = await lyla.get('/')
    const json = response.json
    expect(json).toEqual({ a: { b: 1 } })
    expect(response.json).toBe(json)
    response.json = { overridden: true }
    expect(response.json).toEqual({ overridden: true })
  })
})

describe('core hooks', () => {
  it('calls hooks of instance, overrides and request in order', async () => {
    const calls: string[] = []
    const createHooks = (name: string) => ({
      onInit: [
        (options: LylaRequestOptionsWithContext<undefined>) => {
          calls.push(`${name} onInit`)
          return options
        }
      ],
      onBeforeRequest: [
        (options: LylaRequestOptionsWithContext<undefined>) => {
          calls.push(`${name} onBeforeRequest`)
          return options
        }
      ],
      onHeadersReceived: [
        () => {
          calls.push(`${name} onHeadersReceived`)
        }
      ],
      onAfterResponse: [
        <T>(response: T) => {
          calls.push(`${name} onAfterResponse`)
          return response
        }
      ]
    })
    const { adapter } = createFakeAdapter((request) => {
      setTimeout(() => {
        calls.push('adapter onHeadersReceived')
        request.onHeadersReceived?.({}, undefined)
        respond(request)
      })
    })
    const { lyla } = createLyla(
      adapter,
      { createContext: () => undefined, hooks: createHooks('instance') },
      { hooks: createHooks('override') }
    )
    await lyla.get('/', { hooks: createHooks('request') })
    expect(calls).toEqual([
      'instance onInit',
      'override onInit',
      'request onInit',
      'instance onBeforeRequest',
      'override onBeforeRequest',
      'request onBeforeRequest',
      'adapter onHeadersReceived',
      'instance onHeadersReceived',
      'override onHeadersReceived',
      'request onHeadersReceived',
      'instance onAfterResponse',
      'override onAfterResponse',
      'request onAfterResponse'
    ])
  })

  it('passes raw options to `onInit` and normalized options to `onBeforeRequest`', async () => {
    const initOptions: LylaRequestOptionsWithContext<string>[] = []
    const beforeRequestOptions: LylaRequestOptionsWithContext<string>[] = []
    const { adapter } = createFakeAdapter()
    const { lyla } = createLyla(adapter, {
      createContext: () => 'context',
      baseUrl: 'https://api.test',
      hooks: {
        onInit: [
          (options) => {
            initOptions.push(options)
            return options
          }
        ],
        onBeforeRequest: [
          (options) => {
            beforeRequestOptions.push(options)
            return options
          }
        ]
      }
    })
    await lyla.get('/path', { query: { a: 1 } })
    expect(initOptions[0]).toMatchObject({
      url: '/path',
      method: 'get',
      context: 'context'
    })
    expect(initOptions[0].baseUrl).toBeUndefined()
    expect(beforeRequestOptions[0]).toMatchObject({
      url: 'https://api.test/path?a=1',
      method: 'GET',
      responseType: 'text',
      context: 'context'
    })
  })

  it('uses options returned by sync and async `onInit` and `onBeforeRequest`', async () => {
    const { adapter, requests } = createFakeAdapter()
    const { lyla } = createLyla(adapter, {
      createContext: () => undefined,
      hooks: {
        onInit: [
          (options) => ({ ...options, url: '/init' }),
          async (options) => ({ ...options, query: { from: 'init' } })
        ],
        onBeforeRequest: [
          async (options) => ({ ...options, url: options.url + '&before=1' }),
          (options) => ({ ...options, method: 'POST', json: { a: 1 } })
        ]
      }
    })
    await lyla.get('/')
    expect(requests[0]).toMatchObject({
      url: '/init?from=init&before=1',
      method: 'POST',
      body: '{"a":1}'
    })
  })

  it('normalizes options returned by `onBeforeRequest`', async () => {
    const { adapter, requests } = createFakeAdapter()
    const { lyla } = createLyla(adapter, {
      createContext: () => undefined,
      hooks: {
        onBeforeRequest: [
          (options) => ({ ...options, method: 'post' }),
          (options) => {
            expect(options.method).toBe('POST')
            return { context: options.context }
          }
        ]
      }
    })
    await lyla.post('/path')
    expect(requests[0]).toMatchObject({
      method: 'GET',
      url: '',
      responseType: 'text'
    })
  })

  it('rejects GET request with body set by `onBeforeRequest` with lower case method', async () => {
    const { adapter, requests } = createFakeAdapter()
    const { lyla } = createLyla(adapter, {
      createContext: () => undefined,
      hooks: {
        onBeforeRequest: [
          (options) => ({ ...options, method: 'get', body: 'body' })
        ]
      }
    })
    const error = await catchError(lyla.post('/'))
    expect((error as LylaError).type).toBe(LYLA_ERROR.BAD_REQUEST)
    expect(requests).toHaveLength(0)
  })

  it('passes lower case headers and original request to `onHeadersReceived`', async () => {
    const payloads: unknown[] = []
    const { adapter } = createFakeAdapter((request) => {
      setTimeout(() => {
        request.onHeadersReceived?.({ 'X-Header': 'value' }, 'original request')
        respond(request)
      })
    })
    const { lyla } = createLyla(adapter, {
      createContext: () => 'context',
      hooks: {
        onHeadersReceived: [
          (payload) => {
            payloads.push(payload)
          }
        ]
      }
    })
    await lyla.get('/')
    expect(payloads).toEqual([
      {
        headers: { 'x-header': 'value' },
        originalRequest: 'original request',
        requestOptions: expect.objectContaining({ context: 'context' })
      }
    ])
  })

  it('uses response returned by sync and async `onAfterResponse`', async () => {
    const { adapter } = createFakeAdapter()
    const { lyla } = createLyla(adapter, {
      createContext: () => undefined,
      hooks: {
        onAfterResponse: [
          (response) => {
            response.json = { step: 1 }
            return response
          },
          async (response) => {
            response.json = { step: response.json.step + 1 }
            return response
          }
        ]
      }
    })
    const response = await lyla.get('/')
    expect(response.json).toEqual({ step: 2 })
  })
})

describe('core progress', () => {
  it('passes progress with request options to callbacks', async () => {
    const progress = {
      percent: 50,
      loaded: 5,
      total: 10,
      lengthComputable: true,
      detail: 'progress detail',
      originalRequest: 'original request'
    }
    const { adapter } = createFakeAdapter((request) => {
      setTimeout(() => {
        request.onUploadProgress?.(progress)
        request.onDownloadProgress?.(progress)
        respond(request)
      })
    })
    const { lyla } = createLyla(adapter, { createContext: () => 'context' })
    const uploadProgress: unknown[] = []
    const downloadProgress: unknown[] = []
    await lyla.post('/', {
      onUploadProgress: (p) => uploadProgress.push(p),
      onDownloadProgress: (p) => downloadProgress.push(p)
    })
    const expected = {
      ...progress,
      requestOptions: expect.objectContaining({
        method: 'POST',
        context: 'context'
      })
    }
    expect(uploadProgress).toEqual([expected])
    expect(downloadProgress).toEqual([expected])
  })
})

describe('core abort', () => {
  it.each([
    ['AbortController', () => new AbortController()],
    ['LylaAbortController', () => new LylaAbortController()]
  ])(
    'rejects with `ABORTED` and aborts adapter when %s aborts',
    async (_, createController) => {
      const { adapter, requests, getAbortCount } = createFakeAdapter(() => {})
      const { lyla } = createLyla(adapter, { createContext: () => 'context' })
      const controller = createController()
      const promise = lyla.get('/', { signal: controller.signal })
      await sleep(0)
      expect(requests).toHaveLength(1)
      controller.abort()
      const error = (await catchError(promise)) as LylaError
      expect(error.type).toBe(LYLA_ERROR.ABORTED)
      expect(error.context).toBe('context')
      expect(getAbortCount()).toBe(1)
    }
  )

  it("doesn't send request when signal is already aborted", async () => {
    const { adapter, requests } = createFakeAdapter()
    const { lyla } = createLyla(adapter, { createContext: () => undefined })
    const controller = new AbortController()
    controller.abort()
    const error = await catchError(
      lyla.get('/', { signal: controller.signal })
    )
    expect((error as LylaError).type).toBe(LYLA_ERROR.ABORTED)
    expect(requests).toHaveLength(0)
  })

  it('ignores abort after request is settled', async () => {
    const { adapter, getAbortCount } = createFakeAdapter()
    const { lyla } = createLyla(adapter, { createContext: () => undefined })
    const controller = new AbortController()
    await lyla.get('/', { signal: controller.signal })
    controller.abort()
    expect(getAbortCount()).toBe(0)
  })
})
