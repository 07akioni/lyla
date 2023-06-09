import {
  createLyla as coreCreateLyla,
  mergeOptions as coreMergeOptions
} from '@lylajs/core'
import { adapter } from './adapter'
import type {
  LylaRequestOptions,
  LylaRequestOptionsWithContext
} from './reexports'

export const { lyla, isLylaError } = coreCreateLyla({ adapter, context: {} })

export const createLyla = <C>(options: LylaRequestOptionsWithContext<C>) => {
  return coreCreateLyla(Object.assign({ adapter }, options))
}

export const mergeOptions = coreMergeOptions as <C>(
  ...sources: Array<Partial<LylaRequestOptions<C>> | undefined>
) => LylaRequestOptions<C>
