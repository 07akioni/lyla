import { expect, test } from '@playwright/test'
import { LYLA_ERROR } from '../src/error'
import { beforeEach } from './utils'

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
      return window.matchError(e, ({ lylaError }) => {
        return lylaError?.type
      })
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
  // expect(status).toEqual(200)
  // const errorType = await page.evaluate(async () => {
  //   try {
  //     await window.lyla.post('http://localhost:7070/api/post-check-cookie')
  //   } catch (e) {
  //     return window.matchError(e, ({ lylaError }) => {
  //       return lylaError?.type
  //     })
  //   }
  //   return undefined
  // })
  // expect(errorType).toEqual(LYLA_ERROR.HTTP)
  await page.evaluate(async () => {
    await window.lyla.post('http://localhost:7070/api/post-check-cookie', {
      withCredentials: true
    })
  })
})
