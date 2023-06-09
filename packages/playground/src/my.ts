import { lyla, LYLA_ERROR } from '@lylajs/my'

lyla.get
lyla.post
lyla.put
// @ts-expect-error
lyla.options
// @ts-expect-error
lyla.head
lyla.delete
// @ts-expect-error
lyla.trace
// @ts-expect-error
lyla.connect

lyla
  .get('xxx')
  .then((resp) => {
    resp.detail.data
    resp.detail.headers
    resp.detail.status
  })
  .catch(
    //   if (lylaError?.type === LYLA_ERROR.NETWORK) {
    //     lylaError.detail.error
    //     lylaError.detail.errorMessage
    //   }
    // })
  )
