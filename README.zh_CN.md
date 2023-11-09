# lyla · [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT) [![ci](https://github.com/07akioni/lyla/actions/workflows/node.js.yml/badge.svg)](https://github.com/07akioni/lyla/actions/workflows/node.js.yml/badge.svg) [![npm version](https://badge.fury.io/js/lyla.svg)](https://badge.fury.io/js/lyla) [![minzipped size](https://badgen.net/bundlephobia/minzip/lyla)](https://badgen.net/bundlephobia/minzip/lyla)

一组表现可预期、错误处理可预期的浏览器 HTTP 请求库。

| 环境                           | 包            |
| ------------------------------ | ------------- |
| web                            | `@lylajs/web` |
| 头条小程序                     | `@lylajs/tt`  |
| 微信小程序                     | `@lylajs/wx`  |
| qq 小程序                      | `@lylajs/qq`  |
| 支付宝小程序                   | `@lylajs/my`  |
| web（可用） + nodejs（未完成） | `lyla`        |

[English](https://github.com/07akioni/lyla) · 中文

- 不会在不同的实例中共享配置，也就是说你的实例不会被别人影响
- 不会隐式转换响应数据（例如在不能解析成 JSON 时转换成 string）
- 不吞异常（例如 JSON 解析错误、配置错误）
- [可预期的异常处理](#异常处理)
- 响应数据支持 TypeScript 类型
- 支持上传进度（基于 fetch API 无法做到）
- 更友好的异常 trace（包含同步调用栈，出错时你可以看到请求发起的位置）
- 请求链路中可以附加带类型的自定义 context 对象

和其他库的差别见 [FAQ](#faq)。

## 安装

```bash
# 你可以安装 `lyla` 或 `@lylajs/xxx`
npm i @lylajs/web # 使用 npm 安装
pnpm i @lylajs/web # 使用 pnpm 安装
yarn add @lylajs/web # 使用 yarn 安装
```

## 使用

```ts
import { createLyla } from '@lylajs/web'

// 对于需要默认配置、拦截器或附带上下文的请求，建议使用 createLyla 建立 Lyla 实例
// 如果你只需要最简单的使用，可以
// import { lyla } from '@lylajs/web'
const { lyla } = createLyla({ context: null })

const { json } = await lyla.post('https://example.com', {
  json: { foo: 'bar' }
})

// TypeScript
type MyType = {}

// `json` 的类型是 `MyType`
const { json } = await lyla.post<MyType>('https://example.com', {
  json: { foo: 'bar' }
})
```

## API

### `createLyla(options, ...overrides)`

```ts
function createLyla<C>(
  options: LylaRequestOptions & { context: C },
  ...overrides: LylaRequestOptions[]
): { lyla: Lyla; isLylaError: (e: unknown) => e is LylaError }
```

### `lyla<T>(options: LylaRequestOptions): LylaResponse<T>`

### `lyla.get<T>(options: LylaRequestOptions): LylaResponse<T>`

### `lyla.post<T>(options: LylaRequestOptions): LylaResponse<T>`

### `lyla.put<T>(options: LylaRequestOptions): LylaResponse<T>`

### `lyla.patch<T>(options: LylaRequestOptions): LylaResponse<T>`

### `lyla.head<T>(options: LylaRequestOptions): LylaResponse<T>`

### `lyla.delete<T>(options: LylaRequestOptions): LylaResponse<T>`

### `lyla.connect<T>(options: LylaRequestOptions): LylaResponse<T>`

### `lyla.options<T>(options: LylaRequestOptions): LylaResponse<T>`

### `lyla.trace<T>(options: LylaRequestOptions): LylaResponse<T>`

#### `LylaRequestOptions` 类型

```ts
type LylaRequestOptions<C = {}> = {
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
  responseType?: 平台相关
  body?: 平台相关
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
  onUploadProgress?: (progress: LylaProgress) => void
  onDownloadProgress?: (progress: LylaProgress) => void
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
        response: LylaResponse<any>,
        reject: (reason: unknown) => void
      ) => LylaResponse<any> | Promise<LylaResponse<any>>
    >
    /**
     * 响应处理遇到异常时的回调。只会在 LylaError 产生时被触发，用户触发的异常不会触发此回
     * 调，例如用户在 `onAfterResponse` 回调中抛出异常不会触发该回调。
     */
    onResponseError?: Array<
      (error: LylaResponseError<C, M>, reject: (reason: unknown) => void) => void
    >
    /**
     * 任何非 onResponseError 触发的错误都会触发次回调（除了 BROKEN_ON_NON_RESPONSE_ERROR）
     */
    onNonResponseError?: Array<
      (error: LylaNonResponseError<C, M>) => void | Promise<void>
    >
  }
  /**
   * 请求的自定义上下文
   */
  context?: C
}
```

#### `LylaResponse` 类型

```ts
type LylaResponse<T = any, C = {}> = {
  requestOptions: LylaRequestOptions
  status: number
  statusText: string
  /**
   * 响应头，key 全部都是小写
   */
  headers: Record<string, string>
  /**
   * 响应主体
   */
  body: 平台相关
  /**
   * 响应的 JSON 值。如果响应主体不是合法的 JSON 文本，获取这个值会抛出一个异常
   */
  json: T
  /**
   * 请求的上下文
   */
  context: C
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

#### `LylaRequestHeaders` 类型

```ts
type LylaRequestHeaders = Record<string, string | number | undefined>
```

请求头部可以是 `string`、`number` 或 `undefined`。如果它是 `undefined`，则可以去掉默认请求头，例如：

```ts
import { createLyla } from '@lylajs/web'

const { lyla } = createLyla({ headers: { foo: 'bar' }, context: null })

// 请求不会有 `foo` 请求头
lyla.get('http://example.com', { headers: { foo: undefined } })
```

## 异常处理

```ts
import { createLyla, LYLA_ERROR } from '@lylajs/web'

const { lyla, isLylaError } = createLyla({ context: null })

try {
  const { json } = await lyla.get('https://example.com')
  // ...
} catch (e) {
  if (isLylaError(e)) {
    e.type
    // ...
  } else {
    // ...
  }
}
```

### `LylaError` 类型

```ts
// 这不是个精确的定义，具体类型是平台相关的，如果需要完整的定义，请参考
// https://github.com/07akioni/lyla/blob/main/packages/core/src/error.ts
type LylaError<C = {}> = {
  name: string
  message: string
  type: LYLA_ERROR
  // Error 对应的原始 error，通常没什么用，目前只有 JSON 不合法会产生，一般来说你需要使用
  // detail 字段
  error: Error | undefined
  detail: 平台相关 // 平台产生的错误关联信息
  response: 平台相关 // 类似于 LylaResponse | undefined
  // 请求的上下文
  context: C
}
```

### `LYLA_ERROR`

```ts
export enum LYLA_ERROR {
  /**
   * 请求遇到了异常，被 XHR `onerror` 事件触发。这不一定说明你的网络本身有问题，例如跨域的错
   * 误也可以触发一个网络错误
   */
  NETWORK = 'NETWORK',
  /**
   * 请求被丢弃
   */
  ABORTED = 'ABORTED',
  /**
   * 响应文本不是合法 JSON
   */
  INVALID_JSON = 'INVALID_JSON',
  /**
   * 试图对于 `responseType='arraybuffer'` 或 `responseType='blob'` 的响应访问
   * `response.json`
   */
  INVALID_CONVERSION = 'INVALID_CONVERSION',
  /**
   * 请求超时
   */
  TIMEOUT = 'TIMEOUT',
  /**
   * 响应 HTTP 状态异常
   */
  HTTP = 'HTTP',
  /**
   * 请求的配置不合法，它不是一个响应异常
   */
  BAD_REQUEST = 'BAD_REQUEST',
  /**
   * `onAfterResponse` 回调抛了异常
   */
  BROKEN_ON_AFTER_RESPONSE = 'BROKEN_ON_AFTER_RESPONSE',
  /**
   * `onBeforeRequest` 回调抛了异常
   */
  BROKEN_ON_BEFORE_REQUEST = 'BROKEN_ON_BEFORE_REQUEST',
  /**
   * `onInit` 回调抛了异常
   */
  BROKEN_ON_INIT = 'BROKEN_ON_INIT',
  /**
   * `onResponseError` 回调抛了异常
   */
  BROKEN_ON_RESPONSE_ERROR = 'BROKEN_ON_RESPONSE_ERROR',
  /**
   * `onDataConversionError` 回调抛了异常
   */
  BROKEN_ON_DATA_CONVERSION_ERROR = 'BROKEN_ON_DATA_CONVERSION_ERROR'
}
```

### 全局异常监听

```ts
import { createLyla } from '@lylajs/web'

const { lyla } = createLyla({
  context: null,
  hooks: {
    onResponseError(error) {
      switch error.type {
        // ...
      }
    },
    onDataConversionError(error) {
       switch error.type {
        // ...
      }
    }
  }
})
```

## 中止请求

你可以使用原生的 `AbortController` 或者 `LylaAbortController` 去终止请求。

需要注意的是 `LylaAbortController` 并没有实现全部 `AbortController` 的 API。

```ts
import { createLyla, LylaAbortController } from '@lylajs/web'

const controller = new LylaAbortController()

const { lyla } = createLyla({ context: null })

lyla.get('url', {
  signal: controller.signal
})

controller.abort()
```

## 上下文

在拦截器、响应和异常中可以获取到一个上下文对象：

```ts
const { lyla, isLylaError } = createLyla({
  context: {
    startTime: -1,
    endTime: -1,
    duration: -1
  },
  hooks: {
    onInit: [
      (options) => {
        options.context.startTime = Date.now()
        return options
      }
    ],
    onResponseError: [
      (options) => {
        options.context.endTime = Date.now()
        options.context.duration =
          options.context.endTime - options.context.startTime
        return options
      }
    ],
    onAfterResponse: [
      (options) => {
        options.context.endTime = Date.now()
        options.context.duration =
          options.context.endTime - options.context.startTime
        return options
      }
    ]
  }
})

lyla.get('/foo').then((response) => {
  console.log(response.context.duration)
})
```

## FAQ

- 为什么不用 axios？
  - `axios.defaults` 对所有 axios 使用 `axios.create` 创建的实例都生效，也就是说你的代码可能意外的被其他人影响，并且没有选项去避免这点
  - `axios.defaults` 是一个全局单例，也就是说你无法保证拿到一个干净的副本，因为你的代码可能运行在修改了它的代码之后
  - axios 默认会静默地把不合法的 JSON 值转化为 string
  - axios 无法在请求链路中传递一个有类型的上下文对象
- 为什么不用 ky？
  - ky 基于 fetch，无法支持上传进度
  - ky 的 Response 响应数据无法指定特定类型
  - ky 无法在请求链路中传递一个有类型的上下文对象
