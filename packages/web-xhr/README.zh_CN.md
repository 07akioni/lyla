# @lylajs/web-xhr

[English](./README.md) · [简体中文](./README.zh_CN.md)

Lyla 的 XMLHttpRequest 适配器，提供类型支持和明确的错误处理。始终使用
XMLHttpRequest，支持上传和下载进度。

## 安装

使用 npm、pnpm 或 Yarn 安装：

```bash
npm install @lylajs/web-xhr
pnpm add @lylajs/web-xhr
yarn add @lylajs/web-xhr
```

## 使用

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

本包导出 `lyla`、`createLyla`、`adapter`、`LylaAbortController`、`LYLA_ERROR`、
错误判断函数及对应的 TypeScript 类型。

- 支持 `text`、`arraybuffer` 和 `blob` 响应类型。
- 支持上传进度、下载进度、超时和取消。
- `response.detail`、网络错误详情和进度详情为原生 `ProgressEvent`。
  `originalRequest` 为原生 `XMLHttpRequest`。

`@lylajs/web` 支持按请求选择 XMLHttpRequest 或 fetch。`@lylajs/web-fetch` 固定
使用 fetch。

[完整文档](https://github.com/07akioni/lyla/blob/main/README.zh_CN.md) ·
[English documentation](https://github.com/07akioni/lyla#readme)
