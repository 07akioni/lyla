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
export type Lyla<C = undefined> = LylaCore<C, LylaAdapterMeta>
export type LylaRequestOptions<C = undefined> = LylaCoreRequestOptions<
  C,
  LylaAdapterMeta
>
export type LylaRequestOptionsWithContext<C = undefined> =
  LylaCoreRequestOptionsWithContext<C, LylaAdapterMeta>
export type LylaResponse<T = any, C = undefined> = LylaCoreResponse<
  T,
  C,
  LylaAdapterMeta
>

// error
export type LylaResponseError<C = undefined> = LylaCoreResponseError<
  C,
  LylaAdapterMeta
>
export type LylaError<C = undefined> = LylaCoreError<C, LylaAdapterMeta>

export { LYLA_ERROR, LylaProgress, LylaAbortController } from '@lylajs/core'
