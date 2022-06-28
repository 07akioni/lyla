import { createLyla } from '@lylajs/core'
import { adapter } from './adapter.js'

export const { lyla, catchError, matchError } = createLyla({ adapter })
