import { defineConfig } from '@playwright/test'
import { browserTargets } from './fixtures/browser-targets'

export default defineConfig({
  testDir: './tests',
  projects: [
    ...browserTargets.map((target) => ({
      name: target.name,
      metadata: { target: target.name },
      testIgnore: [
        '**/web-routing.spec.ts',
        target.api === 'fetch' ? '**/xhr-only.spec.ts' : '**/fetch-only.spec.ts'
      ]
    })),
    {
      name: 'web-routing',
      metadata: { target: 'web-auto' },
      testMatch: '**/web-routing.spec.ts'
    }
  ]
})
