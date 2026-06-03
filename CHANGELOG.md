# Changelog

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
