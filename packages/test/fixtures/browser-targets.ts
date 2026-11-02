export type BrowserTarget = {
  name: string
  module: 'index' | 'web-xhr' | 'web-fetch'
  api: 'xhr' | 'fetch'
  extraOptions?: {
    api: 'auto' | 'xhr' | 'fetch'
    fetchOptions?: Record<string, never>
  }
}

export const browserTargets: BrowserTarget[] = [
  { name: 'web-auto', module: 'index', api: 'xhr', extraOptions: { api: 'auto' } },
  {
    name: 'web-auto-fetch', module: 'index', api: 'fetch',
    extraOptions: { api: 'auto', fetchOptions: {} }
  },
  { name: 'web-xhr', module: 'index', api: 'xhr', extraOptions: { api: 'xhr' } },
  { name: 'web-fetch', module: 'index', api: 'fetch', extraOptions: { api: 'fetch' } },
  { name: 'standalone-xhr', module: 'web-xhr', api: 'xhr' },
  { name: 'standalone-fetch', module: 'web-fetch', api: 'fetch' }
]
