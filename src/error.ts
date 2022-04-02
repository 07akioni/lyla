import type { LylaResponse } from './types.js'

export enum LYLA_ERROR {
  NETWORK = 'NETWORK',
  ABORTED = 'ABORTED',
  INVALID_JSON = 'INVALID_JSON',
  INVALID_TRANSFORMATION = 'INVALID_TRANSFORMATION',
  TIMEOUT = 'TIMEOUT',
  HTTP = 'HTTP'
}

export interface LylaTimeoutError extends Error {
  type: LYLA_ERROR.TIMEOUT
  error: undefined
  event: ProgressEvent<XMLHttpRequestEventTarget>
  response: undefined
}

export interface LylaInvalidTransformationError extends Error {
  type: LYLA_ERROR.INVALID_TRANSFORMATION
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
  response: LylaResponse<string>
}

export interface LylaAbortedError extends Error {
  type: LYLA_ERROR.ABORTED
  error: undefined
  event: ProgressEvent<XMLHttpRequestEventTarget>
  response: undefined
}

export type LylaError =
  | LylaNetworkError
  | LylaInvalidJSONError
  | LylaAbortedError
  | LylaHttpError
  | LylaInvalidTransformationError
  | LylaTimeoutError

class _LylaError extends Error {}

export function defineLylaError<T extends LylaError>(
  error: Omit<T, 'name'>
): LylaError {
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
  matcher: <T>(
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

export type OnError = typeof catchError
