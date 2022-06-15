import { createLyla } from '@lylajs/core'
import { adapter } from '@lylajs/web'
import { LylaAdapterMeta } from './adapter'

export const { lyla, catchError, matchError } = createLyla<LylaAdapterMeta>({
  adapter
})
