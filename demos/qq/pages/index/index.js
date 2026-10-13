const { lyla, isLylaError } = require('@lylajs/qq/dist/index')

Page({
  data: {
    respBody: '请求中'
  },
  onLoad: function () {
    lyla.get('https://randomuser.me/api/', {
      headers: {
        foo: 'bar'
      }
    }).then(resp => {
      console.log(resp)
      console.log(resp.json)
    })
    lyla.get('https://www.baidu.com').then(resp => {
      console.log(resp.body)
    })
    lyla.get('xxx').catch((error) => {
      if (isLylaError(error)) {
        console.log('lylaError.detail', error.detail)
      } else {
        console.log('error', error)
      }
    })
  },
})
