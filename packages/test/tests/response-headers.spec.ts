import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { headerFixtures } from '../fixtures/response-headers'
import { beforeEach } from './utils'
import './types'

let origin: string
let crossOrigin: string
const servers: Server[] = []
const bodyGates = new Map<string, () => void>()

async function respond(request: IncomingMessage, response: ServerResponse) {
  const url = new URL(request.url!, 'http://localhost')
  response.sendDate = false
  if (url.pathname === '/') {
    response.setHeader('Content-Type', 'text/html')
    response.end(await readFile(resolve(__dirname, '../server/index.html')))
    return
  }
  if (url.pathname.startsWith('/es/')) {
    const filename = url.pathname.slice(4)
    if (!/^[\w.-]+\.js$/.test(filename)) {
      response.writeHead(404).end()
      return
    }
    response.setHeader('Content-Type', 'text/javascript')
    response.end(await readFile(resolve(__dirname, '../es', filename)))
    return
  }
  if (url.pathname === '/redirect') {
    response.writeHead(302, {
      Location: '/fixture?id=1',
      'X-Redirect-Only': 'hidden'
    }).end()
    return
  }
  const id = Number(url.searchParams.get('id') ?? 1)
  const status = Number(url.searchParams.get('status') ?? 200)
  const cors = url.searchParams.get('cors')
  const body = 'body'
  const headers: Array<[string, string]> = [
    ['Content-Type', 'text/plain; charset=utf-8'],
    ['Connection', 'close'],
    ['X-Content-Type-Options', 'nosniff'],
    ['X-Response-Marker', String(id)],
    ...headerFixtures[id].fields
  ]
  if (status !== 204) headers.push(['Content-Length', String(body.length)])
  if (cors) {
    headers.push(
      ['Cache-Control', 'no-cache'],
      ['Content-Language', 'en'],
      ['Expires', 'Wed, 21 Oct 2015 07:28:00 GMT'],
      ['Last-Modified', 'Wed, 21 Oct 2015 07:28:00 GMT'],
      ['Pragma', 'no-cache'],
      ['X-Visible', 'visible'],
      ['X-Hidden', 'hidden']
    )
    if (cors !== 'blocked') {
      headers.push(['Access-Control-Allow-Origin', origin], ['Access-Control-Allow-Credentials', 'true'])
    }
    if (cors === 'expose') headers.push(['Access-Control-Expose-Headers', 'X-Visible, Set-Cookie, Set-Cookie2'])
    if (cors === 'wildcard') headers.push(['Access-Control-Expose-Headers', '*'])
  }
  if (url.searchParams.has('cookies') || cors) {
    headers.push(['Set-Cookie', 'header_a=1; Path=/'], ['Set-Cookie', 'header_b=2; Path=/'], ['Set-Cookie2', 'legacy=1'])
  }
  response.writeHead(status, headers.flat())
  const gate = url.searchParams.get('hold')
  if (gate) {
    bodyGates.set(gate, () => response.end(Buffer.from(body.slice(1))))
    response.on('close', () => bodyGates.delete(gate))
    response.flushHeaders()
    response.write(Buffer.from(body.slice(0, 1)))
    return
  }
  // A binary body keeps Node from encoding a combined header/body write as
  // UTF-8, which would change Latin-1 header bytes before they reach the browser.
  response.end(request.method === 'HEAD' || status === 204 || status === 304 ? undefined : Buffer.from(body))
}

async function startServer() {
  const server = createServer((request, response) => {
    void respond(request, response).catch((error) => response.destroy(error))
  })
  servers.push(server)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Missing test server address')
  return `http://127.0.0.1:${address.port}`
}

test.beforeAll(async () => {
  origin = await startServer()
  crossOrigin = await startServer()
})

test.afterAll(async () => {
  for (const release of bodyGates.values()) release()
  await Promise.all(servers.map((server) => new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve())
    server.closeAllConnections()
  })))
})

beforeEach(test, () => origin)

type ReadOptions = {
  url: string
  method?: 'GET' | 'HEAD'
  responseType?: 'text' | 'arraybuffer' | 'blob'
  withCredentials?: boolean
  mutateHookHeaders?: boolean
}

declare global {
  interface Window {
    headerTiming: {
      events: string[]
      received: Array<Record<string, string>>
      headers?: Record<string, string>
    }
    headerPending: Promise<void>
  }
}

async function readHeaders(page: Page, options: ReadOptions) {
  return page.evaluate(async (options) => {
    const received: Array<Record<string, string>> = []
    const events: string[] = []
    try {
      const response = await window.lyla({
        url: options.url,
        method: options.method ?? 'GET',
        responseType: options.responseType ?? 'text',
        withCredentials: options.withCredentials,
        hooks: { onHeadersReceived: [({ headers }) => {
          received.push({ ...headers })
          events.push('headers')
          if (options.mutateHookHeaders) {
            headers['x-mixed'] = 'changed by hook'
            headers['x-hook-only'] = 'added by hook'
          }
        }] }
      })
      events.push('response')
      return { headers: response.headers, received, events, status: response.status, errorType: undefined }
    } catch (error) {
      if (!window.isLylaError(error)) throw error
      events.push('error')
      return { headers: error.response?.headers, received, events, status: error.response?.status, errorType: error.type }
    }
  }, options)
}

function expectReceivedHeaders(result: Awaited<ReturnType<typeof readHeaders>>) {
  expect(result.received).toEqual([result.headers])
}

for (const [id, fixture] of headerFixtures.entries()) {
  test(`preserves ${fixture.name}`, async ({ page }) => {
    const result = await readHeaders(page, { url: `${origin}/fixture?id=${id}` })
    expectReceivedHeaders(result)
    expect(result.status).toBe(200)
    expect(result.events).toEqual(['headers', 'response'])
    for (const [key, value] of Object.entries(fixture.expected)) {
      expect(Object.hasOwn(result.headers!, key), key).toBe(true)
      expect(result.headers![key], key).toBe(value)
    }
  })
}

for (const status of [204, 304, 404, 500]) {
  test(`retains response headers for status ${status}`, async ({ page }) => {
    const result = await readHeaders(page, { url: `${origin}/fixture?id=1&status=${status}` })
    expectReceivedHeaders(result)
    expect(result.status).toBe(status)
    expect(result.headers).toMatchObject(headerFixtures[1].expected)
    expect(result.errorType).toBe(status >= 300 ? 'HTTP' : undefined)
    expect(result.events).toEqual(['headers', status >= 300 ? 'error' : 'response'])
  })
}

for (const responseType of ['arraybuffer', 'blob'] as const) {
  test(`retains headers for ${responseType}`, async ({ page }) => {
    const result = await readHeaders(page, { url: `${origin}/fixture?id=1`, responseType })
    expectReceivedHeaders(result)
    expect(result.headers).toMatchObject(headerFixtures[1].expected)
  })
}

test('retains headers on HEAD responses', async ({ page }) => {
  const result = await readHeaders(page, { url: `${origin}/fixture?id=1`, method: 'HEAD' })
  expectReceivedHeaders(result)
  expect(result.headers).toMatchObject(headerFixtures[1].expected)
})

test('exposes only final redirect response headers', async ({ page }) => {
  const result = await readHeaders(page, { url: `${origin}/redirect` })
  expectReceivedHeaders(result)
  expect(result.headers).toMatchObject(headerFixtures[1].expected)
  expect(result.headers).not.toHaveProperty('x-redirect-only')
  expect(result.headers).not.toHaveProperty('location')
  expect(result.events).toEqual(['headers', 'response'])
})

test('does not expose Set-Cookie headers', async ({ page }) => {
  const result = await readHeaders(page, { url: `${origin}/fixture?cookies=1` })
  expectReceivedHeaders(result)
  expect(result.headers).not.toHaveProperty('set-cookie')
  expect(result.headers).not.toHaveProperty('set-cookie2')
})

for (const { cors, withCredentials, visible, hidden } of [
  { cors: 'safelist', withCredentials: false, visible: false, hidden: false },
  { cors: 'expose', withCredentials: false, visible: true, hidden: false },
  { cors: 'expose', withCredentials: true, visible: true, hidden: false },
  { cors: 'wildcard', withCredentials: false, visible: true, hidden: true },
  { cors: 'wildcard', withCredentials: true, visible: false, hidden: false }
]) {
  test(`applies CORS ${cors}, credentials=${withCredentials}`, async ({ page }) => {
    const result = await readHeaders(page, { url: `${crossOrigin}/fixture?cors=${cors}`, withCredentials })
    expectReceivedHeaders(result)
    expect(result.status).toBe(200)
    expect(result.headers).toMatchObject({
      'cache-control': 'no-cache', 'content-language': 'en',
      'content-length': '4', 'content-type': 'text/plain; charset=utf-8',
      expires: 'Wed, 21 Oct 2015 07:28:00 GMT',
      'last-modified': 'Wed, 21 Oct 2015 07:28:00 GMT', pragma: 'no-cache'
    })
    expect(result.headers!['x-visible']).toBe(visible ? 'visible' : undefined)
    expect(result.headers!['x-hidden']).toBe(hidden ? 'hidden' : undefined)
    expect(result.headers).not.toHaveProperty('set-cookie')
    expect(result.headers).not.toHaveProperty('set-cookie2')
  })
}

test('does not report headers when CORS rejects the response', async ({ page }) => {
  const result = await readHeaders(page, { url: `${crossOrigin}/fixture?cors=blocked` })
  expect(result.errorType).toBe('NETWORK')
  expect(result.headers).toBeUndefined()
  expect(result.received).toEqual([])
  expect(result.events).toEqual(['error'])
})

test('hook mutations and prior requests do not change subsequent response headers', async ({ page }) => {
  const first = await readHeaders(page, { url: `${origin}/fixture?id=1`, mutateHookHeaders: true })
  expectReceivedHeaders(first)
  expect(first.headers).toMatchObject(headerFixtures[1].expected)
  expect(first.headers).not.toHaveProperty('x-hook-only')
  const second = await readHeaders(page, { url: `${origin}/fixture?id=2` })
  expectReceivedHeaders(second)
  expect(second.headers).toMatchObject(headerFixtures[2].expected)
  expect(second.headers).not.toHaveProperty('x-mixed')
  expect(second.headers).not.toHaveProperty('x-hook-only')
})

test('reports headers exactly once before the response body completes', async ({ page }) => {
  const token = String(Date.now())
  await page.evaluate(async (token) => {
    const state = { events: [] as string[], received: [] as Record<string, string>[], headers: undefined as Record<string, string> | undefined }
    const pending = window.lyla.get(`/fixture?hold=${token}`, {
      hooks: { onHeadersReceived: [({ headers }) => {
        state.events.push('headers')
        state.received.push(headers)
      }] }
    }).then((response) => {
      state.events.push('response')
      state.headers = response.headers
    })
    Object.assign(window, { headerTiming: state, headerPending: pending })
  }, token)
  await expect.poll(() => page.evaluate(() => window.headerTiming.events)).toEqual(['headers'])
  expect(bodyGates.has(token)).toBe(true)
  bodyGates.get(token)!()
  const result = await page.evaluate(async () => {
    await window.headerPending
    return window.headerTiming
  })
  expect(result.events).toEqual(['headers', 'response'])
  expect(result.received).toEqual([result.headers])
})
