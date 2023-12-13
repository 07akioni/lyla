import type { LylaAdapterMeta as LylaCoreAdapterMeta } from '@lylajs/core'

// TODO: percise type
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
  networkErrorDetail: unknown
  requestBody: any
  responseDetail: unknown
  responseType: 'arraybuffer' | 'blob' | 'text'
  progressDetail: unknown
  originalRequest: unknown
}
