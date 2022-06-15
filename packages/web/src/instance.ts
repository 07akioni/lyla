import { createLyla } from '@lylajs/core'
import { adapter } from './adapter'

export const { lyla, catchError, matchError } = createLyla({ adapter })
