1. <del>reject => { reject }</del>
2. <del>node package</del>
3. <del>headers 2 lower case</del>
4. universal, fix type leakage (seems to be impossible)

```ts
import { createLyla } from '@lylajs/*' // * 是你需要的平台

const { lyla: _lyla } = createLyla({ context: null })

const lyla = _lyla.withRetry({
  createState: () => ({
    count: 0
  }),
  onResolved: async ({ response }) => {
    return {
      action: 'resolve',
      value: response
    }
  },
  onRejected: async ({ state, error, options }) => {
    state.count += 1
    if (state.count > 3) {
      return {
        action: 'reject',
        value: error
      }
    } else {
      return {
        action: 'retry',
        // Retry with the original options
        value: () => options
      }
    }
  }
})
```
