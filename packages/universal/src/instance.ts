import { createLyla as coreCreateLyla } from '@lylajs/core'
import { LylaAdapterMeta } from './adapter'
import type {
  LylaRequestOptions,
  LylaRequestOptionsWithContext
} from './reexports'

const adapter: any =
  // @ts-expect-error
  typeof window === 'undefined'
    ? (require('@lylajs/node') as typeof import('@lylajs/node')).adapter
    : (require('@lylajs/web') as typeof import('@lylajs/web')).adapter

export const { lyla, isLylaError } = coreCreateLyla<undefined, LylaAdapterMeta>(
  adapter,
  {
    context: undefined
  }
)

export const createLyla = <C>(
  options: LylaRequestOptionsWithContext<C>,
  ...overrides: LylaRequestOptions<C>[]
) => {
  return coreCreateLyla(adapter, options, ...overrides)
}
