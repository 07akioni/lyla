import { createLyla as coreCreateLyla } from '@lylajs/core'
import { adapter } from './adapter'
import type {
  LylaCreateOptions,
  LylaContextFactory
} from './reexports'

export const { lyla, isLylaError, isLylaErrorWithRetry } = coreCreateLyla(adapter, {
  createContext: () => undefined
})

export const createLyla = <C>(
  options: LylaCreateOptions<C> & {
    createContext: LylaContextFactory<C>
  },
  ...overrides: LylaCreateOptions<C>[]
) => {
  return coreCreateLyla(adapter, options, ...overrides)
}
