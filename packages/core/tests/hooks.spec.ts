import { expect, test } from '@playwright/test'
import { beforeEach } from './utils'
import './types'

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

test('`hooks` should work with `extend`', async ({ page }) => {
  const body = await page.evaluate(async () => {
    const lyla = window.lyla.extend({
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
    const lyla1 = window.lyla.extend({
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
    })
    const lyla2 = lyla1.extend({
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
    })
    return (await lyla2.post('/gigigi')).body
  })
  expect(body).toEqual('jojo')
})
