import { createLyla } from '@lylajs/web'

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

const { lyla, isLylaError } = createLyla({
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
      (options) => {
        options.context.endTime = Date.now()
        options.context.duration =
          options.context.endTime - options.context.startTime
        return options
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
}
