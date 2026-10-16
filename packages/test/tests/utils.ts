import { test } from '@playwright/test'
import type { Page } from '@playwright/test'

export function beforeEach(t: typeof test) {
  t.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8091')
  })
}

/**
 * Records requests sent by the page whose url contains `pattern`.
 */
export function trackRequests(page: Page, pattern: string) {
  const sent: string[] = []
  const failed: string[] = []
  page.on('request', (request) => {
    if (request.url().includes(pattern)) {
      sent.push(`${request.method()} ${new URL(request.url()).pathname}`)
    }
  })
  page.on('requestfailed', (request) => {
    if (request.url().includes(pattern)) {
      failed.push(request.failure()?.errorText ?? '')
    }
  })
  return { sent, failed }
}

export function uniqueId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export type Echo = {
  method: string
  url: string
  query: Record<string, string[]>
  headers: Record<string, string>
  body: string
}
