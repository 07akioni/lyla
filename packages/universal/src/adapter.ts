import type { LylaAdapterMeta as LylaCoreAdapterMeta } from '@lyla/core'

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
  networkErrorDetail: any
  requestBody: XMLHttpRequestBodyInit
  responseDetail: any
  responseType: 'arraybuffer' | 'blob' | 'text'
  body: XMLHttpRequestBodyInit
}
