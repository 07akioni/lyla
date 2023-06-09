import { lyla, LYLA_ERROR } from '@lylajs/qq'

lyla.get
lyla.post
lyla.put
lyla.options
lyla.head
lyla.delete
lyla.trace
lyla.connect

lyla
  .get('xxx')
  .then((resp) => {
    resp.detail.data
    resp.detail.header
    resp.detail.statusCode
  })
  .catch(
      // if (lylaError?.type === LYLA_ERROR.NETWORK) {
      //   lylaError.detail.errMsg
      // }
  )
