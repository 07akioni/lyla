import type { LylaResponse } from './types.js'

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
  event: undefined
  response: undefined
}

export interface LylaInvalidConversionError extends Error {
  type: LYLA_ERROR.INVALID_CONVERSION
  error: undefined
  event: undefined
  response: LylaResponse
}

export interface LylaHttpError extends Error {
  type: LYLA_ERROR.HTTP
  error: undefined
  event: ProgressEvent<XMLHttpRequestEventTarget>
  response: LylaResponse
}

export interface LylaNetworkError extends Error {
  type: LYLA_ERROR.NETWORK
  error: undefined
  event: ProgressEvent<XMLHttpRequestEventTarget>
  response: undefined
}

export interface LylaInvalidJSONError extends Error {
  type: LYLA_ERROR.INVALID_JSON
  error: SyntaxError
  event: undefined
  response: LylaResponse
}

export interface LylaAbortedError extends Error {
  type: LYLA_ERROR.ABORTED
  error: undefined
  event: undefined
  response: undefined
}

export interface LylaBadRequestError extends Error {
  type: LYLA_ERROR.BAD_REQUEST
  error: undefined
  event: undefined
  response: undefined
}

export type LylaResponseError =
  | LylaNetworkError
  | LylaInvalidJSONError
  | LylaAbortedError
  | LylaHttpError
  | LylaInvalidConversionError
  | LylaTimeoutError

export type LylaError =
  | LylaNetworkError
  | LylaInvalidJSONError
  | LylaAbortedError
  | LylaHttpError
  | LylaInvalidConversionError
  | LylaTimeoutError
  | LylaBadRequestError

class _LylaError extends Error {}

export function defineLylaError<T extends LylaError>(
  lylaErrorProps: Omit<T, 'name'>,
  stack: string | undefined
): T {
  const lylaError = new _LylaError()
  lylaError.name = `LylaError[${lylaErrorProps.type}]`
  if (stack) {
    lylaError.stack += stack
  }
  return Object.assign(lylaError, lylaErrorProps) as any
}

export function isLylaError(error: unknown): error is LylaError {
  return error instanceof _LylaError
}

export function catchError<T, E = Error>(
  handler: LylaErrorHandler<T, E>
): (e: any) => T {
  return (e) => {
    if (isLylaError(e)) {
      return handler({ error: undefined, lylaError: e })
    } else {
      return handler({ error: e, lylaError: undefined })
    }
  }
}

export function matchError<T, E = Error>(
  error: any,
  matcher: LylaErrorHandler<T, E>
): T {
  if (isLylaError(error)) {
    return matcher({ lylaError: error, error: undefined })
  } else {
    return matcher({ lylaError: undefined, error })
  }
}

export type LylaErrorHandler<T, E = Error> = (
  mergedError:
    | { lylaError: LylaError; error: undefined }
    | { lylaError: undefined; error: E }
) => T

export type CatchError = typeof catchError
export type MatchError = typeof matchError
