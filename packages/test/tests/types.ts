import { isLylaError, mergeOptions, Lyla, LylaAbortController, createLyla } from '@lylajs/web'

declare global {
  interface Window {
    lyla: Lyla
    isLylaError: typeof isLylaError,
    mergeOptions: typeof mergeOptions,
    LylaAbortController: typeof LylaAbortController
    createLyla: typeof createLyla
  }
}

export {}
