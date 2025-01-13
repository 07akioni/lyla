import { createLyla as coreCreateLyla } from '@lylajs/core'
import { LylaAdapterMeta } from './adapter'
import type {
  LylaRequestOptions,
  LylaRequestOptionsWithContext
} from './reexports'

const isNode = typeof window === 'undefined'

const adapter: any =
  typeof window === 'undefined'
    ? // webpack may handle this
      (require('@lylajs/node') as typeof import('@lylajs/node')).adapter
    : (require('@lylajs/web') as typeof import('@lylajs/web')).adapter

export const { lyla, isLylaError, isLylaErrorWithRetry } = coreCreateLyla<
  undefined,
  LylaAdapterMeta
>(
  ({
    url,
    method,
    headers,
    body,
    responseType,
    json,
    withCredentials,
    extraOptions,
    onHeadersReceived,
    onDownloadProgress,
    onUploadProgress,
    onResponse,
    onNetworkError
  }) => {
    if (isNode) {
      const _adapter = adapter as typeof import('@lylajs/node').adapter
      const handle = _adapter({
        url,
        method,
        headers,
        body: body as any,
        responseType,
        json,
        withCredentials,
        extraOptions,
        onHeadersReceived(headers, originalRequest) {
          return onHeadersReceived?.(headers, {
            anyhow: originalRequest,
            node: originalRequest,
            web: undefined
          })
        },
        onDownloadProgress(progress) {
          return onDownloadProgress?.({
            total: progress.total,
            loaded: progress.loaded,
            lengthComputable: progress.lengthComputable,
            percent: progress.percent,
            detail: {
              anyhow: progress.detail,
              node: progress.detail,
              web: undefined
            },
            originalRequest: {
              anyhow: progress.originalRequest,
              node: progress.originalRequest,
              web: undefined
            }
          })
        },
        onUploadProgress(progress) {
          return onUploadProgress?.({
            total: progress.total,
            loaded: progress.loaded,
            lengthComputable: progress.lengthComputable,
            percent: progress.percent,
            detail: {
              anyhow: progress.detail,
              node: progress.detail,
              web: undefined
            },
            originalRequest: {
              anyhow: progress.originalRequest,
              node: progress.originalRequest,
              web: undefined
            }
          })
        },
        onResponse({ body, status, headers }, detail) {
          return onResponse(
            { body, status, headers },
            {
              anyhow: detail,
              web: undefined,
              node: detail
            }
          )
        },
        onNetworkError(detail) {
          return onNetworkError({
            anyhow: detail,
            web: undefined,
            node: detail
          })
        }
      })
      return {
        abort: () => {
          handle.abort()
        }
      }
    } else {
      const _adapter = adapter as typeof import('@lylajs/web').adapter
      const handle = _adapter({
        url,
        method,
        headers,
        body,
        responseType,
        json,
        withCredentials,
        extraOptions,
        onHeadersReceived(headers, originalRequest) {
          return onHeadersReceived?.(headers, {
            anyhow: originalRequest,
            node: undefined,
            web: originalRequest
          })
        },
        onDownloadProgress(progress) {
          return onDownloadProgress?.({
            total: progress.total,
            loaded: progress.loaded,
            lengthComputable: progress.lengthComputable,
            percent: progress.percent,
            detail: {
              anyhow: progress.detail,
              node: undefined,
              web: progress.detail
            },
            originalRequest: {
              anyhow: progress.originalRequest,
              node: undefined,
              web: progress.originalRequest
            }
          })
        },
        onUploadProgress(progress) {
          return onUploadProgress?.({
            total: progress.total,
            loaded: progress.loaded,
            lengthComputable: progress.lengthComputable,
            percent: progress.percent,
            detail: {
              anyhow: progress.detail,
              node: undefined,
              web: progress.detail
            },
            originalRequest: {
              anyhow: progress.originalRequest,
              node: undefined,
              web: progress.originalRequest
            }
          })
        },
        onResponse({ body, status, headers }, detail) {
          return onResponse(
            { body, status, headers },
            {
              anyhow: detail,
              web: detail,
              node: undefined
            }
          )
        },
        onNetworkError(detail) {
          return onNetworkError({
            anyhow: detail,
            web: detail,
            node: undefined
          })
        }
      })
      return {
        abort: () => {
          handle.abort()
        }
      }
    }
  },
  {
    context: undefined
  }
)

export const createLyla = <C>(
  options: LylaRequestOptionsWithContext<C>,
  ...overrides: LylaRequestOptions<C>[]
) => {
  return coreCreateLyla(adapter, options, ...overrides)
}
