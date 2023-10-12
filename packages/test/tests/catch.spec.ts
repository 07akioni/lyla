import { expect, test } from '@playwright/test'
import { beforeEach } from './utils'
import './types'

beforeEach(test)

test('catch 500 error', async ({ page }) => {
  const [catched, message] = await page.evaluate(async () => {
    let catched = false
    let message: string = ''
    try {
      await window.lyla.post(`/api/error`, {
        json: {
          jsonKey: 'jsonValue'
        }
      })
    } catch (e) {
      catched = true
      message = (e as Error).message
    }
    return [catched, message]
  })
  expect(catched).toEqual(true)
  expect(message.includes('500')).toEqual(true)
})
