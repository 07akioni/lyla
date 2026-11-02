import type { LylaAdapterMeta as LylaCoreAdapterMeta } from '@lylajs/core'
import type { LylaAdapterMeta as WebAdapterMeta } from '@lylajs/web'
import type { LylaAdapterMeta as NodeAdapterMeta } from '@lylajs/node'

type Detail<K extends keyof WebAdapterMeta & keyof NodeAdapterMeta> =
  | WebAdapterMeta[K]
  | { adapter: 'node'; value: NodeAdapterMeta[K] }

export interface LylaAdapterMeta extends LylaCoreAdapterMeta {
  method: WebAdapterMeta['method'] | NodeAdapterMeta['method']
  requestBody: WebAdapterMeta['requestBody'] | NodeAdapterMeta['requestBody']
  networkErrorDetail: Detail<'networkErrorDetail'>
  responseDetail: Detail<'responseDetail'>
  responseType: WebAdapterMeta['responseType'] | NodeAdapterMeta['responseType']
  progressDetail: Detail<'progressDetail'>
  originalRequest: Detail<'originalRequest'>
  extraOptions: WebAdapterMeta['extraOptions']
}
