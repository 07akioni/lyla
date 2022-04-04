# lyla · [![npm version](https://badge.fury.io/js/lyla.svg)](https://badge.fury.io/js/lyla)

一个表现可预期、错误处理可预期的浏览器 HTTP 请求库。

[English](https://github.com/07akioni/lyla) · 中文

- 不会隐式转换响应数据（例如在不能解析成 JSON 时转换成 string）
- 不吞异常（例如 JSON 解析错误、配置错误）
- 可预期的异常处理
- 响应数据支持 TypeScript 类型
- 支持上传进度（基于 fetch API 无法做到）

和其他库的差别见 [FAQ](/#FAQ)。

## 安装

```bash
npm i lyla # 使用 npm 安装
pnpm i lyla # 使用 pnpm 安装
yarn add lyla # 使用 yarn 安装
```

## 使用

```ts
import { lyla } from 'lyla'

const { json } = await lyla.post('https://example.com', {
  json: { foo: 'bar' }
})
```

## API

### `lyla<T>(options: LylaRequestOptions): LylaResponse<T>`

### `lyla.get<T>(options: LylaRequestOptions): LylaResponse<T>`

### `lyla.post<T>(options: LylaRequestOptions): LylaResponse<T>`

### `lyla.put<T>(options: LylaRequestOptions): LylaResponse<T>`

### `lyla.patch<T>(options: LylaRequestOptions): LylaResponse<T>`

### `lyla.head<T>(options: LylaRequestOptions): LylaResponse<T>`

### `lyla.delete<T>(options: LylaRequestOptions): LylaResponse<T>`

#### `LylaRequestOptions` 类型

```ts
type LylaRequestOptions = {
  url?: string
  method?:
    | 'get'
    | 'GET'
    | 'post'
    | 'POST'
    | 'put'
    | 'PUT'
    | 'patch'
    | 'PATCH'
    | 'head'
    | 'HEAD'
    | 'delete'
    | 'DELETE'
    | 'options'
    | 'OPTIONS'
  timeout?: number
  /**
   * 为 true 时跨域请求时包含 credentials（https://fetch.spec.whatwg.org/#credentials）
   * 为 false 时跨域请求时不包含 credentials，并且会忽略响应的 cookies
   */
  withCredentials?: boolean
  headers?: LylaRequestHeaders
  /**
   * `response.body` 的类型
   */
  responseType?: 'arraybuffer' | 'blob' | 'text'
  body?: XMLHttpRequestBodyInit
  /**
   * 需要被写入请求主体的 JSON 值，不可以同时和 body 使用
   */
  json?: any
  query?: Record<string, string | number>
  baseUrl?: string
  /**
   * 请求使用的 Abort signal
   */
  signal?: AbortSignal
  onUploadProgress?: (
    progress: LylaProgress,
    progressEvent: ProgressEvent<XMLHttpRequestEventTarget>
  ) => void
  onDownloadProgress?: (
    progress: LylaProgress,
    progressEvent: ProgressEvent<XMLHttpRequestEventTarget>
  ) => void
  hooks?: {
    /**
     * 请求选项被传入时的回调，此时选项还没有被转换为最终的请求参数
     */
    onInit?: Array<
      (
        options: LylaRequestOptions
      ) => LylaRequestOptions | Promise<LylaRequestOptions>
    >
    /**
     * 请求发送之前的回调，此时选项已经被转换为最终的请求参数
     */
    onBeforeRequest?: Array<
      (
        options: LylaRequestOptions
      ) => LylaRequestOptions | Promise<LylaRequestOptions>
    >
    /**
     * 收到响应之后的回调
     */
    onAfterResponse?: Array<
      (
        reqsponse: LylaResponse<any>
      ) => LylaResponse<any> | Promise<LylaResponse<any>>
    >
    /**
     * 响应处理遇到异常时的回调。只会在 LylaError 产生时被触发，用户触发的异常不会触发此回
     * 调，例如用户在 `onAfterResponse` 回调中抛出异常不会触发该回调。
     */
    onResponseError?: Array<(error: LylaResponseError) => void>
  }
}
```

#### `LylaResponse` 类型

```ts
type LylaResponse<T = any> = {
  status: number
  statusText: string
  /**
   * 响应头，全部的 key 都是小写
   */
  headers: Record<string, string>
  /**
   * 响应主体
   */
  body: string | ArrayBuffer | Blob
  /**
   * 响应的 JSON 值。如果响应主体不是合法的 JSON 文本，获取这个值会抛出一个异常
   */
  json: T
}
```

#### `LylaProgress` 类型

```ts
type LylaProgress = {
  /**
   * 进度百分比，从 0 到 100
   */
  percent: number
  /**
   * 进度加载的字节数
   */
  loaded: number
  /**
   * 完整进度需要加载的字节数，如果无法获取这个值它会是 0
   */
  total: number
  /**
   * 进度需要加载的总字节数是否可以获取到
   */
  lengthComputable: boolean
}
```

#### `LylaResponseHeaders` 类型

```ts
type LylaRequestHeaders = Record<string, string | number | undefined>
```

请求头部可以是 `string`、`number` 或 `undefined`。如果它是 `undefined`，则可以去掉默认请求头，例如：

```ts
import { lyla } from 'lyla'

const request = lyla.extend({ headers: { foo: 'bar' } })

// 请求不会有 `foo` 请求头
request.get('http://example.com', { headers: { foo: undefined } })
```

### `lyla.extend(options: LylaRequestOptions | ((options: LylaRequestOptions) => LylaRequestOptions)): Lyla`

创建一个有新默认值的 lyla 实例。

```ts
import { lyla } from 'lyla'

const request = lyla.extend({ baseUrl: 'http://example.com' })

request.get() // ...
```

## 异常处理

```ts
import { catchError, matchError, LYLA_ERROR } from 'lyla'

// promise 风格
lyla
  .get('https://example.com')
  .then((resp) => {
    console.log(resp.json)
  })
  .catch(catchError(({ lylaError, error }) => {
    if (lylaError) {
      switch lylaError.type {
        LYLA_ERROR.INVALID_JSON:
          console.log('json parse error')
          break
        default:
          console.log('some error')
      }
    }
  }))

// async 风格
try {
  const { json } = await lyla.get('https://example.com')
} catch (e) {
  matchError(e, ({ lylaError, error }) => {
    // ...
  })
}
```

### 全局异常处理

```ts
import type { LylaError } from 'lyla'

const request = lyla.extend({
  hooks: {
    onResponseError(error: LylaResponseError) {
      switch error.type {
        // ...
      }
    }
  }
})
```

## FAQ

- 为什么不用 axios？
  - `axios.defaults` 对所有 axios 实例都生效，也就是说你的代码可能意外的被其他人影响，并且没有选项去避免这点
  - axios 默认会静默地把不合法的 JSON 值转化为 string
- 为什么不用 ky？
  - ky 基于 fetch，无法支持上传进度
  - ky 的 Response 响应数据无法指定特定类型
