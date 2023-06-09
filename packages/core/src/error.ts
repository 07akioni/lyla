import type { LylaAdapterMeta, LylaResponse } from './types'

export enum LYLA_ERROR {
  /**
   * Request encountered an error, fired by XHR `onerror` event. It doesn't mean
   * your network has error, for example CORS error also triggers NETWORK_ERROR.
   */
  NETWORK = 'NETWORK',
  /**
   * Request is aborted.
   */
  ABORTED = 'ABORTED',
  /**
   * Response text is not valid JSON.
   */
  INVALID_JSON = 'INVALID_JSON',
  /**
   * Trying resolving `response.json` with `responseType='arraybuffer'` or
   * `responseType='blob'`.
   */
  INVALID_CONVERSION = 'INVALID_CONVERSION',
  /**
   * Request timeout.
   */
  TIMEOUT = 'TIMEOUT',
  /**
   * HTTP status error.
   */
  HTTP = 'HTTP',
  /**
   * Request `options` is not valid. It's not a response error.
   */
  BAD_REQUEST = 'BAD_REQUEST'
}

export interface LylaTimeoutError<C> extends Error {
  type: LYLA_ERROR.TIMEOUT
  error: undefined
  detail: undefined
  response: undefined
  context: C
}

export interface LylaInvalidConversionError<
  C,
  M extends LylaAdapterMeta = LylaAdapterMeta
> extends Error {
  type: LYLA_ERROR.INVALID_CONVERSION
  error: undefined
  detail: undefined
  response: LylaResponse<any, C, M>
  context: C
}

export interface LylaHttpError<C, M extends LylaAdapterMeta = LylaAdapterMeta>
  extends Error {
  type: LYLA_ERROR.HTTP
  error: undefined
  detail: undefined
  response: LylaResponse<any, C, M>
  context: C
}

export interface LylaNetworkError<
  C,
  M extends LylaAdapterMeta = LylaAdapterMeta
> extends Error {
  type: LYLA_ERROR.NETWORK
  error: undefined
  detail: M['networkErrorDetail']
  response: undefined
  context: C
}

export interface LylaInvalidJSONError<
  C,
  M extends LylaAdapterMeta = LylaAdapterMeta
> extends Error {
  type: LYLA_ERROR.INVALID_JSON
  error: SyntaxError
  detail: undefined
  response: LylaResponse<any, C, M>
  context: C
}

export interface LylaAbortedError<C> extends Error {
  type: LYLA_ERROR.ABORTED
  error: undefined
  detail: undefined
  response: undefined
  context: C
}

export interface LylaBadRequestError<C> extends Error {
  type: LYLA_ERROR.BAD_REQUEST
  error: undefined
  detail: undefined
  response: undefined
  context: C
}

export type LylaResponseError<
  C = any,
  M extends LylaAdapterMeta = LylaAdapterMeta
> =
  | LylaNetworkError<C, M>
  | LylaHttpError<C, M>
  | LylaInvalidJSONError<C, M>
  | LylaInvalidConversionError<C, M>
  | LylaAbortedError<C>
  | LylaTimeoutError<C>

export type LylaError<C = any, M extends LylaAdapterMeta = LylaAdapterMeta> =
  | LylaNetworkError<C, M>
  | LylaHttpError<C, M>
  | LylaInvalidJSONError<C, M>
  | LylaInvalidConversionError<C, M>
  | LylaAbortedError<C>
  | LylaTimeoutError<C>
  | LylaBadRequestError<C>

type _LylaError = Error & { __lylaError?: true }

function createLylaError(): _LylaError {
  const lylaError: _LylaError = new Error()
  lylaError.__lylaError = true
  return lylaError
}

export function defineLylaError<
  M extends LylaAdapterMeta,
  C,
  T extends LylaError<C, M>
>(lylaErrorProps: Omit<T, 'name'>, stack: string | undefined): T {
  const lylaError = createLylaError()
  lylaError.name = `LylaError[${lylaErrorProps.type}]`
  if (stack) {
    lylaError.stack += stack
  }
  return Object.assign(lylaError, lylaErrorProps) as any
}

export function isLylaError(error: unknown): error is LylaError<any, any> {
  return typeof error === 'object' && !!error && '__lylaError' in error
}
