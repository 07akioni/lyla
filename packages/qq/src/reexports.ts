import type {
  LylaRequestOptions as LylaCoreRequestOptions,
  LylaResponse as LylaCoreResponse,
  Lyla as LylaCore,
  LylaRequestOptionsWithContext as LylaCoreRequestOptionsWithContext
} from '@lylajs/core'
import type {
  LylaResponseError as LylaCoreResponseError,
  LylaError as LylaCoreError
} from '@lylajs/core'
import type { LylaAdapterMeta } from './adapter'

// core
export type Lyla<C = {}> = LylaCore<C, LylaAdapterMeta>
export type LylaRequestOptions<C = {}> = LylaCoreRequestOptions<
  C,
  LylaAdapterMeta
>
export type LylaRequestOptionsWithContext<C = {}> =
  LylaCoreRequestOptionsWithContext<C, LylaAdapterMeta>
export type LylaResponse<T = any, C = {}> = LylaCoreResponse<
  T,
  C,
  LylaAdapterMeta
>

// error
export type LylaResponseError<C = {}> = LylaCoreResponseError<
  C,
  LylaAdapterMeta
>
export type LylaError<C = {}> = LylaCoreError<C, LylaAdapterMeta>

export { LYLA_ERROR, LylaProgress, LylaAbortController } from '@lylajs/core'
