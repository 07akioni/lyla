import type { LylaResponse } from './types.js'

export enum LYLA_ERROR {
  NETWORK = 'NETWORK',
  ABORTED = 'ABORTED',
  INVALID_JSON = 'INVALID_JSON',
  INVALID_CONVERSION = 'INVALID_CONVERSION',
  TIMEOUT = 'TIMEOUT',
  HTTP = 'HTTP',
  BAD_REQUEST = 'BAD_REQUEST'
}

export interface LylaTimeoutError extends Error {
  type: LYLA_ERROR.TIMEOUT
  error: undefined
  event: ProgressEvent<XMLHttpRequestEventTarget>
  response: undefined
}

export interface LylaInvalidConversionError extends Error {
  type: LYLA_ERROR.INVALID_CONVERSION
  error: undefined
  event: undefined
  response: LylaResponse<null>
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
  event: ProgressEvent<XMLHttpRequestEventTarget>
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
  error: Omit<T, 'name'>
): T {
  const lylaError = new _LylaError()
  lylaError.name = `LylaError[${error.type}]`
  return Object.assign(lylaError, error) as any
}

function isLylaError(error: unknown): error is LylaError {
  return error instanceof _LylaError
}

export function catchError<T, E = Error>(
  handler: (
    mergedError:
      | { lylaError: LylaError; error: undefined }
      | { lylaError: undefined; error: E }
  ) => T
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
  matcher: (
    mergedError:
      | { lylaError: LylaError; error: undefined }
      | { lylaError: undefined; error: E }
  ) => T
): T {
  if (isLylaError(error)) {
    return matcher({ lylaError: error, error: undefined })
  } else {
    return matcher({ lylaError: undefined, error })
  }
}

export type CatchError = typeof catchError
export type MatchError = typeof matchError
