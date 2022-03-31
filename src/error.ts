import type { CeekResponse } from './core.js'

export enum CEEK_ERROR {
  NETWORK = 'NETWORK',
  ABORTED = 'ABORTED',
  INVALID_JSON = 'INVALID_JSON',
  INVALID_TRANSFORMATION = 'INVALID_TRANSFORMATION',
  HTTP = 'HTTP'
}

export interface CeekInvalidBodyError extends Error {
  type: CEEK_ERROR.INVALID_TRANSFORMATION
  error: undefined
  event: undefined
  response: CeekResponse
}

export interface CeekHttpError extends Error {
  type: CEEK_ERROR.HTTP
  error: undefined
  event: ProgressEvent<XMLHttpRequestEventTarget>
  response: CeekResponse
}

export interface CeekNetworkError extends Error {
  type: CEEK_ERROR.NETWORK
  error: undefined
  event: ProgressEvent<XMLHttpRequestEventTarget>
  response: undefined
}

export interface CeekInvalidJSONError extends Error {
  type: CEEK_ERROR.INVALID_JSON
  error: SyntaxError
  event: undefined
  response: CeekResponse<string>
}

export interface CeekAbortedError extends Error {
  type: CEEK_ERROR.ABORTED
  error: undefined
  event: ProgressEvent<XMLHttpRequestEventTarget>
  response: undefined
}

export type CeekError =
  | CeekNetworkError
  | CeekInvalidJSONError
  | CeekAbortedError
  | CeekHttpError
  | CeekInvalidBodyError

class _CeekError extends Error {}

export function defineCeekError<T extends CeekError>(
  error: Omit<T, 'name'>
): CeekError {
  const ceekError = new _CeekError()
  ceekError.name = `CeekError[${error.type}]`
  return Object.assign(ceekError, error) as any
}

function isCeekError(error: unknown): error is CeekError {
  return error instanceof _CeekError
}

export function createErrorHandler<T, E = Error>(
  handler: (
    mergedError:
      | { ceekError: CeekError; error: undefined }
      | { ceekError: undefined; error: E }
  ) => T
): (e: any) => T {
  return (e) => {
    if (isCeekError(e)) {
      return handler({ error: undefined, ceekError: e })
    } else {
      return handler({ error: e, ceekError: undefined })
    }
  }
}

export type OnError = typeof createErrorHandler