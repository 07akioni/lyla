import { createLyla, LYLA_ERROR } from '@lylajs/web'

// lyla.get<'GiGi'>('/foo').then((response) => {
//   response.json
// })
// lyla.post
// lyla.put
// lyla.options
// lyla.head
// lyla.delete
// lyla.trace
// lyla.connect

const { lyla, isLylaError, isLylaErrorWithRetry } = createLyla({
  context: {
    startTime: -1,
    endTime: -1,
    duration: -1
  },
  hooks: {
    onInit: [
      (options) => {
        options.context.startTime = Date.now()
        return options
      }
    ],
    onResponseError: [
      (error) => {
        error.context.endTime = Date.now()
        error.context.duration = error.context.endTime - error.context.startTime
      }
    ],
    onAfterResponse: [
      (options) => {
        options.context.endTime = Date.now()
        options.context.duration =
          options.context.endTime - options.context.startTime
        return options
      }
    ]
  }
})

lyla.get('/foo').then((response) => {
  console.log(response.context.duration)
})

try {
  const response = await lyla.post('/foo')
  const data = response.json
  data + data
} catch (e) {
  if (isLylaError(e)) {
    e.context.duration
  }
  if (isLylaErrorWithRetry(e)) {
    switch (e.type) {
      case LYLA_ERROR.RETRY_REJECTED_BY_NON_LYLA_ERROR:
        e.context
        break
      case LYLA_ERROR.BROKEN_RETRY:
        e.context
        break
      case LYLA_ERROR.ABORTED:
        e.context.duration
    }
  }
}
