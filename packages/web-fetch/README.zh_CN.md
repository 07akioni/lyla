# @lylajs/web-fetch

[English](./README.md) · [简体中文](./README.zh_CN.md)

Lyla 的 fetch 适配器，提供类型支持和明确的错误处理。始终使用 Fetch API，支持
下载进度。

## 安装

使用 npm、pnpm 或 Yarn 安装：

```bash
npm install @lylajs/web-fetch
pnpm add @lylajs/web-fetch
yarn add @lylajs/web-fetch
```

## 使用

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

本包导出 `lyla`、`createLyla`、`adapter`、`LylaAbortController`、`LYLA_ERROR`、
错误判断函数及对应的 TypeScript 类型。

- 支持 `text`、`arraybuffer` 和 `blob` 响应类型。
- 支持 `ReadableStream` 请求体，并按需设置 `duplex: 'half'`。
- 支持下载进度、超时和取消。传入 `onUploadProgress` 会在发送请求前报
  `BAD_REQUEST`。
- 通过 `extraOptions.fetchOptions` 设置原生 fetch 选项。`method`、`headers`、
  `body` 和 `signal` 由 Lyla 管理。
- `response.detail` 为原生 `Response`。进度详情为流读取结果，`originalRequest`
  为原生 `Request`。
- 网络错误详情保留原始拒绝原因。错误的 `error` 字段保存原生 `Error` 实例，其他值
  对应 `undefined`。`NETWORK` 包括请求发送前发生的策略校验失败。

`@lylajs/web` 支持按请求选择 XMLHttpRequest 或 fetch。`@lylajs/web-xhr` 固定
使用 XMLHttpRequest，并支持上传进度。

[完整文档](https://github.com/07akioni/lyla/blob/main/README.zh_CN.md) ·
[English documentation](https://github.com/07akioni/lyla#readme)
