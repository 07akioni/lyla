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
      switch (progress.detail.adapter) {
        case 'xhr':
          console.log('XHR 进度事件', progress.detail.value)
          break
        case 'fetch':
          console.log('fetch 流读取结果', progress.detail.value)
          break
        case 'node':
          console.log('Node 进度详情', progress.detail.value)
          break
      }
      console.log(
        progress.originalRequest.adapter,
        progress.originalRequest.value
      )
    }
  })
  .then((v) => {
    v.body
  })
