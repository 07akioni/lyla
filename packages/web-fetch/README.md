# @lylajs/web-fetch

[English](./README.md) · [简体中文](./README.zh_CN.md)

The fetch adapter for Lyla, a typed HTTP client with explicit error handling.
This package always uses the Fetch API and supports download progress.

## Installation

Install with npm, pnpm, or Yarn:

```bash
npm install @lylajs/web-fetch
pnpm add @lylajs/web-fetch
yarn add @lylajs/web-fetch
```

## Usage

```ts
import { lyla } from '@lylajs/web-fetch'

const response = await lyla.get('/api/users', {
  extraOptions: {
    fetchOptions: { cache: 'no-store' }
  },
  onDownloadProgress(progress) {
    console.log(progress.loaded)
  }
})

console.log(response.json)
```

The package exports `lyla`, `createLyla`, `adapter`, `LylaAbortController`,
`LYLA_ERROR`, error guards and the corresponding TypeScript types.

- Supports `text`, `arraybuffer` and `blob` response types.
- Supports `ReadableStream` request bodies, supplying `duplex: 'half'` as needed.
- Supports download progress, timeout and cancellation. Supplying
  `onUploadProgress` rejects with `BAD_REQUEST` before sending the request.
- Native fetch options are passed through `extraOptions.fetchOptions`. Lyla
  controls `method`, `headers`, `body` and `signal`.
- `response.detail` is the native `Response`. Progress details are stream read
  results, and `originalRequest` is the native `Request`.
- Network error details preserve the rejection reason. The error's `error`
  field contains the original `Error`, or `undefined` for non-Error values.
  `NETWORK` may include policy failures before any network request is sent.

Use `@lylajs/web` to select between XMLHttpRequest and fetch per request, or
`@lylajs/web-xhr` to use only XMLHttpRequest with upload progress.

[Full documentation](https://github.com/07akioni/lyla#readme) ·
[中文文档](https://github.com/07akioni/lyla/blob/main/README.zh_CN.md)
