import { createLyla as coreCreateLyla } from '@lylajs/core'
import { adapter } from './adapter'
import type {
  LylaRequestOptions,
  LylaRequestOptionsWithContext
} from './reexports'

export const { lyla, isLylaError } = coreCreateLyla(adapter, {
  context: undefined
})

export const createLyla = <C>(
  options: LylaRequestOptionsWithContext<C>,
  ...overrides: LylaRequestOptions<C>[]
) => {
  return coreCreateLyla(adapter, options, ...overrides)
}
