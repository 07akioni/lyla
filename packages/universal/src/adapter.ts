import type { LylaAdapterMeta as LylaCoreAdapterMeta } from '@lylajs/core'

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
  requestBody: any
  responseDetail: any
  responseType: 'arraybuffer' | 'blob' | 'text'
  body: any
}
