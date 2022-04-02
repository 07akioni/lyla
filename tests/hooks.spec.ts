import { expect, test } from '@playwright/test'
import { beforeEach } from './utils'

beforeEach(test)

test('`hooks` should work', async ({ page }) => {
  const body = await page.evaluate(async () => {
    const lyla = window.lyla.extend({
      hooks: {
        onBeforeOptionsNormalized: [
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
