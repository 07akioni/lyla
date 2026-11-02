// @vitest-environment node
import { LYLA_ERROR } from '@lylajs/core'
import type { LylaAdapterMeta, LylaAdapterOptions } from '@lylajs/core'
import type * as Web from '@lylajs/web'
import type * as Fetch from '@lylajs/web-fetch'
import type * as Xhr from '@lylajs/web-xhr'
import type * as Universal from 'lyla'
import type * as Node from '@lylajs/node'
import type { ClientRequest } from 'node:http'
import { expectTypeOf, it } from 'vitest'

function typeOnly(_: () => unknown) {}
declare const web: typeof Web
declare const fetch: typeof Fetch
declare const xhr: typeof Xhr

it('requires adapters to provide an Error or undefined explicitly', () => {
  typeOnly(() => {
    const report = {} as LylaAdapterOptions<LylaAdapterMeta>['onNetworkError']
    report('detail', new Error('network failed'))
    report('detail', undefined)
    // @ts-expect-error The adapter must supply the error argument.
    report('detail')
    // @ts-expect-error The adapter must normalize non-Error failures.
    report('detail', 'network failed')
  })
})

it('types browser API options and preserves managed request fields', () => {
  typeOnly(() => {
    web.lyla.get('/', { extraOptions: { api: 'xhr' } })
    web.lyla.get('/', { extraOptions: { api: 'auto' } })
    web.lyla.get('/', { extraOptions: { api: 'fetch', fetchOptions: { cache: 'no-store' } } })
    web.lyla.get('/', { extraOptions: { fetchOptions: {} } })
    fetch.lyla.get('/', { extraOptions: { fetchOptions: { credentials: 'include' } } })
    xhr.lyla.get('/')
    // @ts-expect-error Only xhr, fetch and auto are supported.
    web.lyla.get('/', { extraOptions: { api: 'other' } })
    // @ts-expect-error Lyla owns the abort signal.
    fetch.lyla.get('/', { extraOptions: { fetchOptions: { signal: new AbortController().signal } } })
    // @ts-expect-error XHR has no fetch options.
    xhr.lyla.get('/', { extraOptions: { fetchOptions: {} } })
  })
})

it('narrows browser details by the adapter tag', () => {
  typeOnly(() => {
    web.lyla.get('/', {
      hooks: { onHeadersReceived: [({ originalRequest }) => {
        if (originalRequest.adapter === 'xhr') {
          expectTypeOf(originalRequest.value).toEqualTypeOf<XMLHttpRequest>()
        } else {
          expectTypeOf(originalRequest.value).toEqualTypeOf<Request>()
        }
      }] },
      onDownloadProgress(progress) {
        if (progress.detail.adapter === 'xhr') {
          expectTypeOf(progress.detail.value).toEqualTypeOf<ProgressEvent<XMLHttpRequestEventTarget>>()
        } else {
          expectTypeOf(progress.detail.value).toEqualTypeOf<ReadableStreamReadResult<Uint8Array>>()
        }
      }
    }).then((response) => {
      if (response.detail.adapter === 'xhr') {
        expectTypeOf(response.detail.value).toEqualTypeOf<ProgressEvent<XMLHttpRequestEventTarget>>()
      } else {
        expectTypeOf(response.detail.value).toEqualTypeOf<Response>()
      }
    })
    const error = {} as Web.LylaError
    if (error.type === LYLA_ERROR.NETWORK) {
      expectTypeOf(error.error).toEqualTypeOf<Error | undefined>()
      if (error.detail.adapter === 'xhr') {
        expectTypeOf(error.detail.value).toEqualTypeOf<ProgressEvent<XMLHttpRequestEventTarget>>()
      } else {
        expectTypeOf(error.detail.value).toBeUnknown()
      }
    }
  })
  expectTypeOf<Web.LylaProgress['detail']>().toEqualTypeOf<Web.LylaAdapterMeta['progressDetail']>()
  expectTypeOf<Fetch.LylaProgress['detail']>().toEqualTypeOf<ReadableStreamReadResult<Uint8Array>>()
  expectTypeOf<Xhr.LylaProgress['detail']>().toEqualTypeOf<ProgressEvent<XMLHttpRequestEventTarget>>()
})

it('narrows universal details to xhr, fetch or node', () => {
  typeOnly(() => {
    const detail = {} as Universal.LylaAdapterMeta['responseDetail']
    switch (detail.adapter) {
      case 'xhr':
        expectTypeOf(detail.value).toEqualTypeOf<ProgressEvent<XMLHttpRequestEventTarget>>()
        break
      case 'fetch':
        expectTypeOf(detail.value).toEqualTypeOf<Response>()
        break
      case 'node':
        expectTypeOf(detail.value).toBeNull()
        break
    }
    const request = {} as Universal.LylaAdapterMeta['originalRequest']
    switch (request.adapter) {
      case 'xhr':
        expectTypeOf(request.value).toEqualTypeOf<XMLHttpRequest>()
        break
      case 'fetch':
        expectTypeOf(request.value).toEqualTypeOf<Request>()
        break
      case 'node':
        expectTypeOf(request.value).toEqualTypeOf<ClientRequest>()
        break
    }
    const progress = {} as Universal.LylaProgress
    if (progress.detail.adapter === 'node') {
      expectTypeOf(progress.detail.value).toBeNull()
    }
    const error = {} as Universal.LylaError
    if (error.type === LYLA_ERROR.NETWORK && error.detail.adapter === 'node') {
      expectTypeOf(error.detail.value).toEqualTypeOf<Error>()
      expectTypeOf(error.error).toEqualTypeOf<Error | undefined>()
    }
  })
  expectTypeOf<Universal.LylaAdapterMeta['responseType']>().toEqualTypeOf<
    Web.LylaAdapterMeta['responseType'] | Node.LylaAdapterMeta['responseType']
  >()
  expectTypeOf<Universal.LylaAdapterMeta['method']>().toEqualTypeOf<
    Web.LylaAdapterMeta['method'] | Node.LylaAdapterMeta['method']
  >()
})
