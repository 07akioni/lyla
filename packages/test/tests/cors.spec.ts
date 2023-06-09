import { expect, test } from '@playwright/test'
import { LYLA_ERROR } from '@lylajs/web/src'
import { beforeEach } from './utils'
import './types'

beforeEach(test)

test('cors get', async ({ page }) => {
  const { status } = await page.evaluate(async () => {
    return await window.lyla.get('http://localhost:7070/api/get-set-cookie', {
      withCredentials: true
    })
  })
  expect(status).toEqual(200)
  const errorType = await page.evaluate(async () => {
    try {
      await window.lyla.get('http://localhost:7070/api/get-check-cookie')
    } catch (e) {
      if (window.isLylaError(e)) {
        return e.type
      }
      return undefined
    }
    return undefined
  })
  expect(errorType).toEqual(LYLA_ERROR.HTTP)
  await page.evaluate(async () => {
    await window.lyla.get('http://localhost:7070/api/get-check-cookie', {
      withCredentials: true
    })
  })
})

test('cors post', async ({ page }) => {
  const { status } = await page.evaluate(async () => {
    return await window.lyla.post('http://localhost:7070/api/post-set-cookie', {
      withCredentials: true
    })
  })
  expect(status).toEqual(200)
  const errorType = await page.evaluate(async () => {
    try {
      await window.lyla.post('http://localhost:7070/api/post-check-cookie')
    } catch (e) {
      if (window.isLylaError(e)) {
        return e.type
      }
      return undefined
    }
    return undefined
  })
  expect(errorType).toEqual(LYLA_ERROR.HTTP)
  await page.evaluate(async () => {
    await window.lyla.post('http://localhost:7070/api/post-check-cookie', {
      withCredentials: true
    })
  })
})
