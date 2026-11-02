# @lylajs/web-xhr

[English](./README.md) · [简体中文](./README.zh_CN.md)

The XMLHttpRequest adapter for Lyla, a typed HTTP client with explicit error handling.
This package always uses XMLHttpRequest and supports upload and download progress.

## Installation

Install with npm, pnpm, or Yarn:

```bash
npm install @lylajs/web-xhr
pnpm add @lylajs/web-xhr
yarn add @lylajs/web-xhr
```

## Usage

```ts
import { lyla } from '@lylajs/web-xhr'

const response = await lyla.post('/api/users', {
  json: { name: 'Alice' },
  onUploadProgress(progress) {
    console.log(progress.percent)
  }
})

console.log(response.json)
```

The package exports `lyla`, `createLyla`, `adapter`, `LylaAbortController`,
`LYLA_ERROR`, error guards and the corresponding TypeScript types.

- Supports `text`, `arraybuffer` and `blob` response types.
- Supports upload progress, download progress, timeout and cancellation.
- `response.detail`, network error details and progress details expose native
  `ProgressEvent` values. `originalRequest` is the native `XMLHttpRequest`.

Use `@lylajs/web` to select between XMLHttpRequest and fetch per request, or
`@lylajs/web-fetch` to use only fetch.

[Full documentation](https://github.com/07akioni/lyla#readme) ·
[中文文档](https://github.com/07akioni/lyla/blob/main/README.zh_CN.md)
