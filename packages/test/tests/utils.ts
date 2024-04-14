import { test } from '@playwright/test'

export function beforeEach(t: typeof test) {
  t.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8091')
  })
}
