import { expect, test } from '@playwright/test'
import { beforeEach } from './utils'
import './types'
import { LylaRequestOptions } from '@lylajs/web'

beforeEach(test)

test('`hooks` should work', async ({ page }) => {
  const body = await page.evaluate(async () => {
    return (
      await window.lyla.post('/gigigi', {
        hooks: {
          onInit: [
            (options) => {
              if (options.url === '/gigigi') {
                options.url = '/api/post-return-body'
              }
              return options
            }
          ],
          onBeforeRequest: [
            (options) => {
              options.json = { foo: 'bar' }
              return options
            }
          ],
          onAfterResponse: [
            (resp) => {
              if (
                '{"foo":"bar"}' === (resp.body as string).replace(/\s\n/g, '')
              ) {
                resp.body = 'jojo'
              }
              return resp
            }
          ]
        }
      })
    ).body
  })
  expect(body).toEqual('jojo')
})

test('onBeforeRequest should modify headers', async ({ page }) => {
  const headers = await page.evaluate(async () => {
    const { headers } = await window.lyla.post('/api/post-return-headers', {
      hooks: {
        onBeforeRequest: [
          (options) => {
            options.headers = {
              ...options.headers,
              'x-foo': 'bar'
            }
            return options
          }
        ]
      }
    })
    return headers
  })
  expect(headers['x-foo']).toEqual('bar')
})

test(`onResponseError`, async ({ page }) => {
  const result = await page.evaluate(async () => {
    const ret: string[] = []
    try {
      await window.lyla.post('/404', {
        hooks: {
          onResponseError: [
            (error) => {
              if (error.response && error.response.status === 404) {
                ret.push('404')
              }
            }
          ],
          onAfterResponse: [
            (resp) => {
              ret.push(`shouldn't be here`)
              return resp
            }
          ]
        }
      })
    } catch (error) {
      ret.push('error')
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 300)
    })
    return ret
  })
  expect(result).toEqual(['404', 'error'])
})

test('`hooks` should work with `extend`', async ({ page }) => {
  const body = await page.evaluate(async () => {
    const { lyla } = window.createLyla({
      context: null,
      hooks: {
        onInit: [
          (options) => {
            if (options.url === '/gigigi') {
              options.url = '/api/post-return-body'
            }
            return options
          }
        ],
        onBeforeRequest: [
          (options) => {
            options.json = { foo: 'bar' }
            return options
          }
        ],
        onAfterResponse: [
          (resp) => {
            if (
              '{"foo":"bar"}' === (resp.body as string).replace(/\s\n/g, '')
            ) {
              resp.body = 'jojo'
            }
            return resp
          }
        ]
      }
    })
    return (await lyla.post('/gigigi')).body
  })
  expect(body).toEqual('jojo')
})

test('`hooks` should work with multiple `extend`', async ({ page }) => {
  const body = await page.evaluate(async () => {
    const lyla1Options: LylaRequestOptions<null> = {
      hooks: {
        onInit: [
          (options) => {
            if (options.url === '/gigigi') {
              options.url = '/gogogo'
            }
            return options
          }
        ],
        onBeforeRequest: [
          (options) => {
            options.json = { foo: 'bar' }
            return options
          }
        ],
        onAfterResponse: [
          (resp) => {
            if (
              '{"foo":"baz"}' === (resp.body as string).replace(/\s\n/g, '')
            ) {
              resp.body = 'gigi'
            }
            return resp
          }
        ]
      }
    }
    const { lyla: lyla2 } = window.createLyla(
      {
        context: null
      },
      lyla1Options,
      {
        hooks: {
          onInit: [
            (options) => {
              if (options.url === '/gogogo') {
                options.url = '/api/post-return-body'
              }
              return options
            }
          ],
          onBeforeRequest: [
            (options) => {
              if (options.json.foo === 'bar') {
                options.json.foo = 'baz'
              }
              return options
            }
          ],
          onAfterResponse: [
            (resp) => {
              if ('gigi' === resp.body) {
                resp.body = 'jojo'
              }
              return resp
            }
          ]
        }
      }
    )
    return (await lyla2.post('/gigigi')).body
  })
  expect(body).toEqual('jojo')
})

test('`onHeadersReceived` should work', async ({ page }) => {
  const [headers, orders, foo] = await page.evaluate(async () => {
    let headers: Record<string, string> = {}
    let orders: number[] = []
    let { lyla } = window.createLyla<{ foo: string }>({ context: { foo: '' } })
    const { context } = await lyla.post('/api/post-return-headers', {
      headers: {
        'x-foo': 'bar'
      },
      hooks: {
        onHeadersReceived: [
          ({ headers: _headers, requestOptions }) => {
            orders.push(1)
            headers = _headers
            requestOptions.context.foo = 'gigigi'
          }
        ]
      }
    })
    orders.push(2)
    return [headers, orders, context.foo]
  })
  expect(headers['x-foo']).toEqual('bar')
  expect(orders).toEqual([1, 2])
  expect(foo).toEqual('gigigi')
})
