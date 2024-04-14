import type { LylaAdapterMeta as LylaCoreAdapterMeta } from '@lylajs/core'
import type { ClientRequest } from 'http'

export interface LylaAdapterMeta extends LylaCoreAdapterMeta {
  method:
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
    | 'connect'
    | 'CONNECT'
    | 'trace'
    | 'TRACE'
  networkErrorDetail:
    | {
        anyhow: ProgressEvent<XMLHttpRequestEventTarget> | Error
        web: ProgressEvent<XMLHttpRequestEventTarget>
        node: undefined
      }
    | {
        anyhow: ProgressEvent<XMLHttpRequestEventTarget> | Error
        node: Error
        web: undefined
      }
  // Since body is produced in specific env, we don't need user to specify it,
  // For example { anyhow?: xxx, web?: xxx, node?: xxx } is not neccessary
  requestBody: XMLHttpRequestBodyInit | string | Buffer | Uint8Array
  // This is for using uniform adapter to handle the response, it may be usefull
  // in SSR env, however not that neccessary
  responseDetail:
    | {
        anyhow: ProgressEvent<XMLHttpRequestEventTarget> | null
        web: ProgressEvent<XMLHttpRequestEventTarget>
        node: undefined
      }
    | {
        anyhow: ProgressEvent<XMLHttpRequestEventTarget> | null
        web: undefined
        node: null
      }
  responseType: 'arraybuffer' | 'blob' | 'text'
  progressDetail:
    | {
        anyhow: ProgressEvent<XMLHttpRequestEventTarget>
        web: ProgressEvent<XMLHttpRequestEventTarget>
        node: undefined
      }
    | {
        anyhow: ProgressEvent<XMLHttpRequestEventTarget> | null
        web: undefined
        node: null
      }
  originalRequest:
    | {
        anyhow: XMLHttpRequest | ClientRequest
        web: XMLHttpRequest
        node: undefined
      }
    | {
        anyhow: XMLHttpRequest | ClientRequest
        web: undefined
        node: ClientRequest
      }
}
