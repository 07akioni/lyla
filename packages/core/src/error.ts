import type { LylaAdapterMeta, LylaResponse } from './types.js'

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

export interface LylaTimeoutError extends Error {
  type: LYLA_ERROR.TIMEOUT
  error: undefined
  detail: undefined
  response: undefined
}

export interface LylaInvalidConversionError<
  M extends LylaAdapterMeta = LylaAdapterMeta
> extends Error {
  type: LYLA_ERROR.INVALID_CONVERSION
  error: undefined
  detail: undefined
  response: LylaResponse<any, M>
}

export interface LylaHttpError<M extends LylaAdapterMeta = LylaAdapterMeta>
  extends Error {
  type: LYLA_ERROR.HTTP
  error: undefined
  detail: undefined
  response: LylaResponse<any, M>
}

export interface LylaNetworkError<M extends LylaAdapterMeta = LylaAdapterMeta>
  extends Error {
  type: LYLA_ERROR.NETWORK
  error: undefined
  detail: M['networkErrorDetail']
  response: undefined
}

export interface LylaInvalidJSONError<
  M extends LylaAdapterMeta = LylaAdapterMeta
> extends Error {
  type: LYLA_ERROR.INVALID_JSON
  error: SyntaxError
  detail: undefined
  response: LylaResponse<any, M>
}

export interface LylaAbortedError extends Error {
  type: LYLA_ERROR.ABORTED
  error: undefined
  detail: undefined
  response: undefined
}

export interface LylaBadRequestError extends Error {
  type: LYLA_ERROR.BAD_REQUEST
  error: undefined
  detail: undefined
  response: undefined
}

export type LylaResponseError<M extends LylaAdapterMeta = LylaAdapterMeta> =
  | LylaNetworkError<M>
  | LylaHttpError<M>
  | LylaInvalidJSONError<M>
  | LylaInvalidConversionError<M>
  | LylaAbortedError
  | LylaTimeoutError

export type LylaError<M extends LylaAdapterMeta = LylaAdapterMeta> =
  | LylaNetworkError<M>
  | LylaHttpError<M>
  | LylaInvalidJSONError<M>
  | LylaInvalidConversionError<M>
  | LylaAbortedError
  | LylaTimeoutError
  | LylaBadRequestError

class _LylaError extends Error {}

export function defineLylaError<
  M extends LylaAdapterMeta,
  T extends LylaError<M>
>(lylaErrorProps: Omit<T, 'name'>, stack: string | undefined): T {
  const lylaError = new _LylaError()
  lylaError.name = `LylaError[${lylaErrorProps.type}]`
  if (stack) {
    lylaError.stack += stack
  }
  return Object.assign(lylaError, lylaErrorProps) as any
}

export function isLylaError(error: unknown): error is LylaError<any> {
  return error instanceof _LylaError
}

export type LylaErrorHandler<
  T,
  E = Error,
  M extends LylaAdapterMeta = LylaAdapterMeta
> = (
  mergedError:
    | { lylaError: LylaError<M>; error: undefined }
    | { lylaError: undefined; error: E }
) => T
