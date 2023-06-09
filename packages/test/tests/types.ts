import { isLylaError, Lyla, LylaAbortController, createLyla } from '@lylajs/web'

declare global {
  interface Window {
    lyla: Lyla
    isLylaError: typeof isLylaError,
    LylaAbortController: typeof LylaAbortController
    createLyla: typeof createLyla
  }
}

export {}
