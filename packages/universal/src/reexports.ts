import type {
  LylaRequestOptions as LylaCoreRequestOptions,
  LylaResponse as LylaCoreResponse,
  Lyla as LylaCore
} from '@lylajs/core'
import type {
  LylaErrorHandler as LylaCoreErrorHandler,
  LylaResponseError as LylaCoreResponseError,
  LylaError as LylaCoreError
} from '@lylajs/core'
import type { LylaAdapterMeta } from './adapter.js'

// core
export type Lyla = LylaCore<LylaAdapterMeta>
export type LylaRequestOptions = LylaCoreRequestOptions<LylaAdapterMeta>
export type LylaResponse = LylaCoreResponse<LylaAdapterMeta>

// error
export type LylaErrorHandler<T, E = Error> = LylaCoreErrorHandler<
  T,
  E,
  LylaAdapterMeta
>
export type LylaResponseError = LylaCoreResponseError<LylaAdapterMeta>
export type LylaError = LylaCoreError<LylaAdapterMeta>

export { isLylaError, LYLA_ERROR, LylaProgress, LylaAbortController } from '@lylajs/core'
