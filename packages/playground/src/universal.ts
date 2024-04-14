import { lyla } from 'lyla'

lyla.get
lyla.post
lyla.put
lyla.options
lyla.head
lyla.delete
lyla.trace
lyla.connect

lyla
  .get('foo', {
    onDownloadProgress: (progress) => {
      if (progress.detail.web !== undefined) {
        const detail: ProgressEvent<XMLHttpRequestEventTarget> =
          progress.detail.web
        console.log('在 web 环境', detail)
      } else {
        const detail: null = progress.detail.node
        console.log('在 node 环境', detail)
      }
      if (progress.originalRequest.web !== undefined) {
        const originalRequest: XMLHttpRequest = progress.originalRequest.web
        console.log('在 web 环境', originalRequest)
      } else {
        const originalRequest = progress.originalRequest.node
        console.log('在 node 环境', originalRequest)
      }
      console.log(
        '无所谓在什么环境',
        progress.detail.anyhow,
        progress.originalRequest.anyhow
      )
    }
  })
  .then((v) => {
    v.body
  })
