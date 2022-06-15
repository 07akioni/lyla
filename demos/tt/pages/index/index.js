const { lyla } = require('@lylajs/tt')

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
    })
  }
})
