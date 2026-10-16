import {
  isLylaError,
  isLylaErrorWithRetry,
  Lyla,
  LylaAbortController,
  createLyla,
  LYLA_ERROR
} from '@lylajs/web'

declare global {
  interface Window {
    lyla: Lyla
    isLylaError: typeof isLylaError,
    isLylaErrorWithRetry: typeof isLylaErrorWithRetry
    LylaAbortController: typeof LylaAbortController
    createLyla: typeof createLyla
    LYLA_ERROR: typeof LYLA_ERROR
  }
}

export {}
