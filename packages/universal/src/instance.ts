import { createLyla as coreCreateLyla } from '@lylajs/core'
import type { LylaAdapter } from '@lylajs/core'
import type { LylaAdapterMeta } from './adapter'
import type {
  LylaCreateOptions,
  LylaContextFactory
} from './reexports'

const isNode = typeof window === 'undefined'

const adapter = isNode
  ? (require('@lylajs/node') as typeof import('@lylajs/node')).adapter
  : (require('@lylajs/web') as typeof import('@lylajs/web')).adapter

const universalAdapter: LylaAdapter<LylaAdapterMeta> = (options) => {
  if (!isNode) {
    const webAdapter = adapter as typeof import('@lylajs/web').adapter
    return webAdapter({
      ...options,
      body: options.body as import('@lylajs/web').LylaAdapterMeta['requestBody']
    })
  }

  const nodeAdapter = adapter as typeof import('@lylajs/node').adapter
  const {
    onHeadersReceived,
    onDownloadProgress,
    onUploadProgress,
    onResponse,
    onNetworkError
  } = options
  return nodeAdapter({
    ...options,
    body: options.body as import('@lylajs/node').LylaAdapterMeta['requestBody'],
    extraOptions: undefined as never,
    onHeadersReceived: onHeadersReceived
      ? (headers, request) => onHeadersReceived(headers, {
          adapter: 'node', value: request
        })
      : undefined,
    onDownloadProgress: onDownloadProgress
      ? (progress) => onDownloadProgress({
          ...progress,
          detail: { adapter: 'node', value: progress.detail },
          originalRequest: { adapter: 'node', value: progress.originalRequest }
        })
      : undefined,
    onUploadProgress: onUploadProgress
      ? (progress) => onUploadProgress({
          ...progress,
          detail: { adapter: 'node', value: progress.detail },
          originalRequest: { adapter: 'node', value: progress.originalRequest }
        })
      : undefined,
    onResponse: (response, detail) =>
      onResponse(response, { adapter: 'node', value: detail }),
    onNetworkError: (detail, error) =>
      onNetworkError({ adapter: 'node', value: detail }, error)
  })
}

export const { lyla, isLylaError, isLylaErrorWithRetry } = coreCreateLyla(
  universalAdapter,
  { createContext: () => undefined }
)

export const createLyla = <C>(
  options: LylaCreateOptions<C> & {
    createContext: LylaContextFactory<C>
  },
  ...overrides: LylaCreateOptions<C>[]
) => {
  return coreCreateLyla(universalAdapter, options, ...overrides)
}
