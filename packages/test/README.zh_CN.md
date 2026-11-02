# 测试

[English](./README.md) · [简体中文](./README.zh_CN.md)

在仓库根目录运行 `pnpm test`，会构建各个包、启动 HTTP 测试服务，并执行 Node 和
浏览器测试。

浏览器测试在以下 Playwright 项目中执行同一套用例：

| 项目 | 入口 | 选择方式 |
| --- | --- | --- |
| `web-auto` | `@lylajs/web` | `api: 'auto'`，普通请求参数 |
| `web-auto-fetch` | `@lylajs/web` | `api: 'auto'`，`fetchOptions: {}` |
| `web-xhr` | `@lylajs/web` | `api: 'xhr'` |
| `web-fetch` | `@lylajs/web` | `api: 'fetch'` |
| `standalone-xhr` | `@lylajs/web-xhr` | 原生 XHR 适配器 |
| `standalone-fetch` | `@lylajs/web-fetch` | 原生 fetch 适配器 |

共同用例覆盖请求、响应体、响应头、错误、取消、下载进度、CORS、hooks、实例配置和
重试。每个项目都检查实际的原生请求及响应详情，以验证适配器选择。独立包测试直接
使用对应包的导出，并获取原生详情。

`xhr-only.spec.ts` 测试上传进度及上传过程中的取消。`fetch-only.spec.ts` 测试传入
上传进度回调或 GET 请求体时的错误行为。`web-routing.spec.ts` 在独立的
`web-routing` 项目中执行，测试显式 API 选择和 fetch 专属参数的路由。

在当前目录中执行部分浏览器测试：

```sh
./tests/before-test.sh
pnpm exec playwright test --project=web-auto --project=web-fetch
./tests/after-test.sh
```

新增共同用例放在 `tests/*.spec.ts` 中，默认在六个项目中执行。适配器专属用例放在
对应的 `*-only.spec.ts` 文件中。
