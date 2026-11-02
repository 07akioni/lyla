import type {
  createLyla,
  Lyla,
  LylaError,
  LylaErrorWithRetry,
  LylaRequestOptions as CoreRequestOptions,
  LylaCreateOptions,
  LylaContextFactory,
  LylaAbortController,
  LYLA_ERROR
} from '@lylajs/core'
import type { LylaAdapterMeta as WebMeta } from '@lylajs/web'
import type { LylaAdapterMeta as XhrMeta } from '@lylajs/web-xhr'
import type { LylaAdapterMeta as FetchMeta } from '@lylajs/web-fetch'
import type { BrowserTarget } from '../fixtures/browser-targets'

// Preserve native details when testing the standalone packages.
interface BrowserMeta extends Omit<WebMeta,
  'originalRequest' | 'responseDetail' | 'networkErrorDetail' | 'progressDetail'
> {
  originalRequest: WebMeta['originalRequest'] | XhrMeta['originalRequest'] | FetchMeta['originalRequest']
  responseDetail: WebMeta['responseDetail'] | XhrMeta['responseDetail'] | FetchMeta['responseDetail']
  networkErrorDetail: unknown
  progressDetail: WebMeta['progressDetail'] | XhrMeta['progressDetail'] | FetchMeta['progressDetail']
}

export type BrowserRequestOptions<C> = CoreRequestOptions<C, BrowserMeta>

declare global {
  interface Window {
    browserTarget: BrowserTarget
    nativeDetail(detail: unknown): unknown
    lyla: Lyla<undefined, BrowserMeta>
    isLylaError(error: unknown): error is LylaError<any, BrowserMeta>
    isLylaErrorWithRetry(error: unknown): error is LylaErrorWithRetry<any, BrowserMeta>
    LylaAbortController: typeof LylaAbortController
    createLyla: <C>(
      options: LylaCreateOptions<C, BrowserMeta> & {
        createContext: LylaContextFactory<C>
      },
      ...overrides: LylaCreateOptions<C, BrowserMeta>[]
    ) => ReturnType<typeof createLyla<C, BrowserMeta>>
    LYLA_ERROR: typeof LYLA_ERROR
  }
}

export {}
