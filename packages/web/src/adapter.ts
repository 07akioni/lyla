import type {
  LylaAdapter,
  LylaAdapterMeta as LylaCoreAdapterMeta
} from '@lylajs/core'
import { adapter as xhrAdapter } from '@lylajs/web-xhr'
import type { LylaAdapterMeta as XhrAdapterMeta } from '@lylajs/web-xhr'
import { adapter as fetchAdapter } from '@lylajs/web-fetch'
import type { LylaAdapterMeta as FetchAdapterMeta } from '@lylajs/web-fetch'

type Detail<K extends keyof XhrAdapterMeta & keyof FetchAdapterMeta> =
  | { adapter: 'xhr'; value: XhrAdapterMeta[K] }
  | { adapter: 'fetch'; value: FetchAdapterMeta[K] }

export interface LylaAdapterMeta extends LylaCoreAdapterMeta {
  method: XhrAdapterMeta['method']
  requestBody: XhrAdapterMeta['requestBody'] | FetchAdapterMeta['requestBody']
  responseBody: XhrAdapterMeta['responseBody'] | FetchAdapterMeta['responseBody']
  networkErrorDetail: Detail<'networkErrorDetail'>
  responseDetail: Detail<'responseDetail'>
  progressDetail: Detail<'progressDetail'>
  responseType: XhrAdapterMeta['responseType'] | FetchAdapterMeta['responseType']
  originalRequest: Detail<'originalRequest'>
  extraOptions: FetchAdapterMeta['extraOptions'] & {
    /**
     * Defaults to auto: use fetch for fetchOptions (including {}) or a
     * ReadableStream body, and XMLHttpRequest for all other options.
     */
    api?: 'xhr' | 'fetch' | 'auto'
  }
}

export const adapter: LylaAdapter<LylaAdapterMeta> = (options) => {
  const {
    extraOptions,
    onHeadersReceived,
    onDownloadProgress,
    onUploadProgress,
    onNetworkError,
    onResponse
  } = options
  const requestedApi = extraOptions?.api || 'auto'
  const hasStreamBody =
    typeof ReadableStream !== 'undefined' && options.body instanceof ReadableStream
  if (requestedApi === 'xhr' && extraOptions?.fetchOptions !== undefined) {
    throw new Error('`fetchOptions` cannot be used with `api: "xhr"`')
  }
  if (requestedApi === 'xhr' && hasStreamBody) {
    throw new Error('ReadableStream bodies cannot be used with `api: "xhr"`')
  }
  const api = requestedApi === 'auto'
    ? (extraOptions?.fetchOptions !== undefined || hasStreamBody ? 'fetch' : 'xhr')
    : requestedApi

  if (api === 'fetch') {
    return fetchAdapter({
      ...options,
      onHeadersReceived: onHeadersReceived
        ? (headers, request) => onHeadersReceived(headers, { adapter: 'fetch', value: request })
        : undefined,
      onDownloadProgress: onDownloadProgress
        ? (progress) => onDownloadProgress({
          ...progress,
          detail: { adapter: 'fetch', value: progress.detail },
          originalRequest: { adapter: 'fetch', value: progress.originalRequest }
        })
        : undefined,
      // The fetch adapter rejects this callback before sending the request.
      onUploadProgress: onUploadProgress ? () => {} : undefined,
      onNetworkError: (detail, error) =>
        onNetworkError({ adapter: 'fetch', value: detail }, error),
      onResponse: (response, detail) =>
        onResponse(response, { adapter: 'fetch', value: detail })
    })
  }

  return xhrAdapter({
    ...options,
    body: options.body as XhrAdapterMeta['requestBody'],
    extraOptions: undefined as never,
    onHeadersReceived: onHeadersReceived
      ? (headers, request) => onHeadersReceived(headers, { adapter: 'xhr', value: request })
      : undefined,
    onDownloadProgress: onDownloadProgress
      ? (progress) => onDownloadProgress({
        ...progress,
        detail: { adapter: 'xhr', value: progress.detail },
        originalRequest: { adapter: 'xhr', value: progress.originalRequest }
      })
      : undefined,
    onUploadProgress: onUploadProgress
      ? (progress) => onUploadProgress({
        ...progress,
        detail: { adapter: 'xhr', value: progress.detail },
        originalRequest: { adapter: 'xhr', value: progress.originalRequest }
      })
      : undefined,
    onNetworkError: (detail, error) =>
      onNetworkError({ adapter: 'xhr', value: detail }, error),
    onResponse: (response, detail) =>
      onResponse(response, { adapter: 'xhr', value: detail })
  })
}
