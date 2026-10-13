const { lyla, isLylaError } = require('@lylajs/tt/dist/index')

Page({
  data: {
    respBody: 'wait for response'
  },
  onLoad: function () {
    lyla.get('https://www.baidu.com').then((resp) => {
      console.log(resp.body)
      this.setData({
        respBody: resp.body
      })
    }).catch((error) => {
      if (isLylaError(error)) {
        console.log(error.detail)
      } else {
        console.log(error)
      }
    })
  }
})
