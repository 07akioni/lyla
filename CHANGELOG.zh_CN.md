# 更新日志

## 3.0.0

`v2.2.0` 之后的变更。

### 破坏性变更

- 上下文不再通过 `JSON.parse(JSON.stringify(...))` 深拷贝，改为用工厂函数为每个请求创建上下文。
  - `createLyla` 不再接受 `context`，改为必须传入 `createContext`。它的选项和覆盖选项使用新的类型 `LylaCreateOptions`。
  - 每次请求时，会依次调用 `createLyla` 的选项和覆盖选项中的 `createContext`，最后调用请求中的 `createContext`。每个工厂函数通过 `parent` 拿到上一个工厂函数创建的上下文（第一个拿到的是 `null`）。
  - 请求中的 `context` 会被原样使用，不会被拷贝。
  - 同时设置了 `context` 和 `createContext` 的请求会以 `LYLA_ERROR.BAD_REQUEST` 被拒绝。
  - 如果工厂函数抛出异常，请求不会被发送，并以 `LYLA_ERROR.BAD_REQUEST` 被拒绝，它的 `error` 是抛出的异常，`context` 是 `undefined`。这个错误会被传给 `onNonResponseError` 钩子。

  ```ts
  // 2.x
  createLyla({ context: { retryCount: 0 } })
  // 3.0
  createLyla({ createContext: () => ({ retryCount: 0 }) })
  ```

- `withRetry` 必须传入新增的 `onBrokenRetry` 选项。以前 `onResolved`、`onRejected` 或者 retry 动作的 `value` 函数抛出异常时，会直接抛出 `LYLA_ERROR.BROKEN_RETRY` 错误；现在这个错误会被传给 `onBrokenRetry`，由它返回 `reject` 或 `retry` 动作。`createState` 抛出的异常以前会被原样抛出，现在也会被包装成 `BROKEN_RETRY` 错误传给 `onBrokenRetry`，此时 `state` 是 `undefined`。保持 2.x 的行为（`createState` 除外）可以这样写：

  ```ts
  lyla.withRetry({
    // ...
    onBrokenRetry: async ({ error }) => ({ action: 'reject', value: error })
  })
  ```

- `onInit` 之后的请求选项使用新的类型 `LylaNormalizedRequestOptions`，其中 `url` 是 `string`，`method` 是大写的，`responseType` 是必填的。用到它的位置有：
  - `onBeforeRequest` 的参数（返回值类型仍然是 `LylaRequestOptionsWithContext`）；
  - `onHeadersReceived`、`LylaProgress` 和 `LylaResponse` 的 `requestOptions`；
  - 选项规范化之后产生的错误的 `requestOptions`。

  `BROKEN_ON_INIT` 错误仍然使用 `LylaRequestOptionsWithContext`。读取这些字段不受影响；手动构造 `LylaResponse` 或 `LylaProgress` 的代码需要传入规范化之后的选项。
- `BAD_REQUEST` 和 `BROKEN_ON_NON_RESPONSE_ERROR` 错误可能在上下文创建之前产生（`createContext` 抛出异常时），所以它们的 `context` 类型是 `C | undefined`，`requestOptions` 类型是 `LylaRequestOptions`。因此没有按 `type` 收窄的 `LylaError` 的 `context` 类型是 `C | undefined`。
- `withRetry` 的 `onRejected` 收到的 `context` 类型是 `C | undefined`，请求在上下文创建之前被拒绝时它是 `undefined`。
- `withRetry` 的 `onBrokenRetry` 收到的 `state` 类型是 `S | undefined`，`createState` 抛出异常时它是 `undefined`。
- `LYLA_ERROR.BAD_REQUEST` 错误的 `error` 字段类型从 `undefined` 改为 `unknown`，因为它现在可能包含原始的异常（见修复）。
- `AbortSignal` 类型的 `readonly aborted: boolean` 变为必填。原生的 `AbortController` 和 `LylaAbortController` 都满足这个要求。
- 请求发送之前产生的错误（`BAD_REQUEST`、`BROKEN_ON_INIT`、`BROKEN_ON_BEFORE_REQUEST`）现在会等 `onNonResponseError` 钩子执行完再抛出。如果钩子抛出异常，请求会以 `LYLA_ERROR.BROKEN_ON_NON_RESPONSE_ERROR` 被拒绝。以前会不等钩子执行完就抛出原始错误，钩子抛出的异常会丢失。

### 新功能

- 请求选项新增 `createContext`，可以在 `createLyla` 创建的上下文的基础上创建这个请求的上下文。
- `withRetry` 新增 `onBrokenRetry`，在重试回调出错时决定拒绝还是重试。它不应该抛出异常，如果抛出了，这个异常会被原样抛出。
- `@lylajs/core` 和所有平台包导出新类型 `LylaNormalizedRequestOptions`、`LylaCreateOptions` 和 `LylaContextFactory`，平台包现在也导出 `LylaRequestOptionsWithContext`。

### 修复

- 修复请求发送之前产生的错误（`BROKEN_ON_INIT`、`BROKEN_ON_BEFORE_REQUEST`，以及由 `query` 或 `json` 引起的 `BAD_REQUEST`）会导致一个未处理的 `ReferenceError` promise rejection 的问题。原因是错误处理函数在变量初始化之前就读取了它们。对于 `BROKEN_ON_INIT`，`onNonResponseError` 钩子完全不会被调用。
- 修复带 body 的 GET 请求会先被发送出去，然后才以 `BAD_REQUEST` 被拒绝的问题。现在请求不会被发送。
- 修复省略 `method` 时 GET body 检查被跳过的问题。以前默认的 method 是小写的 `'get'`，和 `'GET'` 匹配不上；现在默认值是 `'GET'`。
- 修复 `createLyla` 的选项、覆盖选项和 `onInit` 中的 `responseType` 被忽略的问题。以前只会使用请求中的 `responseType`。
- `onBeforeRequest` 返回的选项会被再次规范化。例如钩子返回小写的 `method`，现在会在发送前被转为大写，GET body 检查对它同样生效。
- 修复将 header 设为 `undefined` 时，大小写不同的同名 header 不会被删除的问题，例如 `{ 'Content-Type': undefined }` 不会删除 `content-type`。
- 修复 `signal` 已经被取消时请求仍然会被发送的问题。现在请求不会被发送，直接以 `LYLA_ERROR.ABORTED` 被拒绝。
- 修复 `@lylajs/web` 中包含 `:` 的响应头的值会被截断的问题，例如 `date: Fri, 16 Oct 2026 13:00:00 GMT` 会被解析成 `Fri, 16 Oct 2026 13`。没有 `:` 或者名字为空的响应头行现在会被忽略。
- 修复 `@lylajs/wx` 中 `responseType` 为 `'arraybuffer'` 且设置了 `onDownloadProgress` 时，`response.body` 是 `Uint8Array` 而不是 `ArrayBuffer` 的问题。
- 修复 `json` 无法序列化（例如循环引用或包含 BigInt），或者 adapter 发送请求时抛出异常（例如 URL 或 header 的值不合法）时，请求会以原始的 `TypeError` 被拒绝的问题。现在请求会以 `LYLA_ERROR.BAD_REQUEST` 被拒绝，`error` 字段是原始的异常。
- 修复 `onHeadersReceived` 抛出异常后，如果响应在 `onNonResponseError` 钩子执行完之前到达，请求会被 resolve 的问题。现在请求总会以 `LYLA_ERROR.BROKEN_ON_HEADERS_RECEIVED` 被拒绝。
- 修复请求结果已经确定之后，如果钩子（例如 async 的 `onAfterResponse`）在超时的时候还没执行完，请求会以 `LYLA_ERROR.TIMEOUT` 被拒绝的问题：已经收到的响应会变成超时错误，钩子通过 `reject` 传入的值会被替换，已经完成的请求还会被 abort。现在 `timeout` 只限制收到响应、网络错误或中止之前的时间。
- 修复请求在响应到达之前被拒绝（例如 `onHeadersReceived` 抛出异常或调用 `reject`）时，底层请求不会被 abort 的问题。以前响应到达之后仍然会被处理，已经被拒绝的请求还会调用 `onAfterResponse` 或 `onResponseError` 钩子。现在请求被拒绝时底层请求会被 abort。

### 测试

- 新增请求选项、错误、上下文、重试、类型和 web adapter 响应头解析的单元测试。
- 新增测试，确保无论是否使用 `withRetry`，只要请求不是被手动拒绝的，就总会以 lyla error 被拒绝；被手动拒绝的请求会以传入的值原样被拒绝。
- 新增基于测试服务器的请求、错误和重试的 Playwright 测试。

## 2.2.0

`v2.1.5` 之后的变更。

### 破坏性变更

- 移除 `LYLA_ERROR.RETRY_REJECTED_BY_NON_LYLA_ERROR`。
- 移除 `withRetry` 的 reject 动作返回非 Lyla 错误时的包装。`onResolved` 和 `onRejected` 的 reject 动作现在会直接抛出返回的值，不管它是不是 Lyla 错误。

### 修复

- 修复 web adapter 中的超时处理：XHR abort 触发的 `loadend` 回调不会再把超时的请求变成 HTTP 错误。
- 修复 `abort()` 触发 adapter 错误回调时的超时处理：请求仍然以 `LYLA_ERROR.TIMEOUT` 被拒绝，而不是由 abort 引起的网络错误。

### 测试

- 新增 `withRetry.onResolved` 和 `withRetry.onRejected` 直接拒绝非 Lyla 错误的回归测试。
- 新增超时触发 abort 回调时保持 `LYLA_ERROR.TIMEOUT` 的回归测试。
