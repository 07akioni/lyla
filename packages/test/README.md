# Tests

[English](./README.md) · [简体中文](./README.zh_CN.md)

From the repository root, run `pnpm test` to build the packages, start the HTTP
fixtures, and run the Node and browser tests.

The browser tests share one set of cases across these Playwright projects:

| Project | Entry point | Selection |
| --- | --- | --- |
| `web-auto` | `@lylajs/web` | `api: 'auto'`, ordinary request options |
| `web-auto-fetch` | `@lylajs/web` | `api: 'auto'`, `fetchOptions: {}` |
| `web-xhr` | `@lylajs/web` | `api: 'xhr'` |
| `web-fetch` | `@lylajs/web` | `api: 'fetch'` |
| `standalone-xhr` | `@lylajs/web-xhr` | Native XHR adapter |
| `standalone-fetch` | `@lylajs/web-fetch` | Native fetch adapter |

Shared cases cover requests, response bodies and headers, errors, cancellation,
download progress, CORS, hooks, instance options and retries. Each project checks
the actual native request and response details to verify adapter selection. The
standalone projects use their package exports directly and expose native details.

`xhr-only.spec.ts` covers upload progress and cancellation during upload.
`fetch-only.spec.ts` covers rejection of unsupported upload progress and GET
bodies. `web-routing.spec.ts` runs in the separate `web-routing` project to check
explicit API selection and fetch-specific routing.

To run a subset, from this directory:

```sh
./tests/before-test.sh
pnpm exec playwright test --project=web-auto --project=web-fetch
./tests/after-test.sh
```

New shared cases belong in `tests/*.spec.ts` and run in all six projects by
default. Add adapter-specific cases to the corresponding `*-only.spec.ts` file.
