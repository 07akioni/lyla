import { createLyla } from '@lyla/core'
import { adapter } from './adapter'

export const { lyla, catchError, matchError } = createLyla({ adapter })
