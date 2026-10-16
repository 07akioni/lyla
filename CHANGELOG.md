# Changelog

## 3.0.0

Changes since `v2.2.0`.

### Breaking Changes

- Context is no longer deep cloned with `JSON.parse(JSON.stringify(...))`. Use a factory to create the context of each request instead.
  - `createLyla` no longer accepts `context`. `createContext` is required instead. Its options and overrides have the new type `LylaCreateOptions`.
  - `createContext` of `createLyla`'s options and overrides, then the request's `createContext`, are called in order for each request. Each factory receives the context created by the previous one as `parent` (`null` for the first one).
  - `context` of a request is used as is, without being cloned.
  - A request that sets both `context` and `createContext` is rejected with `LYLA_ERROR.BAD_REQUEST`.
  - If a factory throws, the request isn't sent and is rejected with `LYLA_ERROR.BAD_REQUEST`, whose `error` is the thrown error and `context` is `undefined`. The error is passed to `onNonResponseError` hooks.

  ```ts
  // 2.x
  createLyla({ context: { retryCount: 0 } })
  // 3.0
  createLyla({ createContext: () => ({ retryCount: 0 }) })
  ```

- `withRetry` requires a new `onBrokenRetry` option. Previously, if `onResolved`, `onRejected` or the `value` function of a retry action threw, a `LYLA_ERROR.BROKEN_RETRY` error was thrown directly. Now the error is passed to `onBrokenRetry`, which can return a `reject` or `retry` action. An error thrown by `createState`, which was thrown as is, is also wrapped into a `BROKEN_RETRY` error and passed to `onBrokenRetry`, with `state` being `undefined`. To keep the 2.x behavior (except for `createState`):

  ```ts
  lyla.withRetry({
    // ...
    onBrokenRetry: async ({ error }) => ({ action: 'reject', value: error })
  })
  ```

- Request options after `onInit` now have the type `LylaNormalizedRequestOptions`. In this type, `url` is a `string`, `method` is upper case, and `responseType` is required. It's used by:
  - the parameter of `onBeforeRequest` (its return type is still `LylaRequestOptionsWithContext`);
  - `requestOptions` of `onHeadersReceived`, `LylaProgress` and `LylaResponse`;
  - `requestOptions` of errors raised after options are normalized.

  `BROKEN_ON_INIT` errors keep `LylaRequestOptionsWithContext`. Reading these fields isn't affected. Code that builds a `LylaResponse` or `LylaProgress` by hand needs to pass normalized options.
- `BAD_REQUEST` and `BROKEN_ON_NON_RESPONSE_ERROR` errors may be raised before the context is created (when `createContext` throws), so their `context` is typed `C | undefined` and their `requestOptions` is typed `LylaRequestOptions`. As a result, `context` of a `LylaError` that isn't narrowed by `type` is `C | undefined`.
- `context` passed to `onRejected` of `withRetry` is typed `C | undefined`. It's `undefined` when the request is rejected before its context is created.
- `state` passed to `onBrokenRetry` of `withRetry` is typed `S | undefined`. It's `undefined` when `createState` throws.
- The type of `error` of `LYLA_ERROR.BAD_REQUEST` errors is changed from `undefined` to `unknown`, since it may hold the original error now (see Fixes).
- The `AbortSignal` type now requires `readonly aborted: boolean`. Both the native `AbortController` and `LylaAbortController` satisfy it.
- Errors raised before a request is sent (`BAD_REQUEST`, `BROKEN_ON_INIT`, `BROKEN_ON_BEFORE_REQUEST`) are now thrown after `onNonResponseError` hooks finish. If a hook throws, the request is rejected with `LYLA_ERROR.BROKEN_ON_NON_RESPONSE_ERROR`. Previously the original error was thrown without waiting for the hooks, and an error thrown by a hook was lost.

### Features

- Added `createContext` to request options, which creates the context of the request based on the context created by `createLyla`.
- Added `onBrokenRetry` to `withRetry`, which decides whether to reject or retry when retry callbacks are broken. It should not throw. If it throws, the error is thrown as is.
- Exported types `LylaNormalizedRequestOptions`, `LylaCreateOptions` and `LylaContextFactory` from `@lylajs/core` and all platform packages. `LylaRequestOptionsWithContext` is also exported from platform packages now.

### Fixes

- Fixed errors raised before a request is sent (`BROKEN_ON_INIT`, `BROKEN_ON_BEFORE_REQUEST`, and `BAD_REQUEST` caused by `query` or `json`) causing an unhandled promise rejection of `ReferenceError`. The error handler read variables before they were initialized. For `BROKEN_ON_INIT`, `onNonResponseError` hooks weren't called at all.
- Fixed a GET request with body being sent before it's rejected with `BAD_REQUEST`. Now the request isn't sent.
- Fixed the GET body check being skipped when `method` is omitted. The default method was lower case `'get'`, which didn't match `'GET'`. Now the default method is `'GET'`.
- Fixed `responseType` of `createLyla`'s options, overrides and `onInit` being ignored. Previously only `responseType` of the request was used.
- Options returned by `onBeforeRequest` are normalized again. For example, a lower case `method` returned by the hook is now converted to upper case before the request is sent, so the GET body check also applies to it.
- Fixed setting a header to `undefined` not removing it when the header name has a different case, for example `{ 'Content-Type': undefined }` didn't remove `content-type`.
- Fixed a request being sent when its `signal` is already aborted. Now it's rejected with `LYLA_ERROR.ABORTED` without being sent.
- Fixed response header values containing `:` being truncated in `@lylajs/web`, for example `date: Fri, 16 Oct 2026 13:00:00 GMT` was parsed as `Fri, 16 Oct 2026 13`. Header lines without `:` or with an empty name are now ignored.
- Fixed `response.body` being a `Uint8Array` instead of an `ArrayBuffer` in `@lylajs/wx` when `responseType` is `'arraybuffer'` and `onDownloadProgress` is set.
- Fixed a request being rejected with a raw `TypeError` when `json` can't be serialized (for example it's circular or contains a BigInt), or when the adapter throws while sending the request (for example the URL or a header value is invalid). Now it's rejected with `LYLA_ERROR.BAD_REQUEST`, whose `error` is the original error.
- Fixed a request being resolved when `onHeadersReceived` throws and the response arrives before `onNonResponseError` hooks finish. Now it's always rejected with `LYLA_ERROR.BROKEN_ON_HEADERS_RECEIVED`.
- Fixed a request being rejected with `LYLA_ERROR.TIMEOUT` after its outcome was received, when hooks (for example an async `onAfterResponse`) were still running at the time of timeout. The response was turned into a timeout, a reason passed to `reject` of the hook was replaced, and the finished request was aborted. Now `timeout` only limits the time before the response, the network error or the abort is received.
- Fixed the underlying request not being aborted when the request is rejected before the response arrives, for example when `onHeadersReceived` throws or calls `reject`. The response was still handled after it arrived, so `onAfterResponse` or `onResponseError` hooks were called for the rejected request. Now it's aborted when the request is rejected.

### Tests

- Added unit tests for request options, errors, context, retry, types and the web adapter's header parsing.
- Added tests ensuring that, with and without `withRetry`, a request is always rejected with a lyla error unless it's rejected manually, and a manually rejected request is rejected with the reason as is.
- Added Playwright tests for requests, errors and retry against the test server.

## 2.2.0

Changes since `v2.1.5`.

### Breaking Changes

- Removed `LYLA_ERROR.RETRY_REJECTED_BY_NON_LYLA_ERROR`.
- Removed the retry wrapper for non-Lyla errors returned from `withRetry` reject actions. `onResolved` and `onRejected` reject actions now throw their returned value directly, whether or not it is a Lyla error.

### Fixes

- Fixed timeout handling in the web adapter path so an XHR abort `loadend` callback no longer turns a timed-out request into an HTTP error.
- Fixed timeout handling when `abort()` triggers adapter error callbacks, so the request still rejects with `LYLA_ERROR.TIMEOUT` instead of an abort-derived network error.

### Tests

- Added regression coverage for direct non-Lyla error rejection from both `withRetry.onResolved` and `withRetry.onRejected`.
- Added regression coverage for timeout-triggered abort callbacks preserving `LYLA_ERROR.TIMEOUT`.
