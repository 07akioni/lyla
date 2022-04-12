import { createLyla } from '@lyla/core'
import { adapter } from '@lyla/web'
import { LylaAdapterMeta } from './adapter'

export const { lyla, catchError, matchError } = createLyla<LylaAdapterMeta>({ adapter })
