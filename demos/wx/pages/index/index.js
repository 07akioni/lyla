const { lyla } = require('@lylajs/wx')

// index.js
Page({
  data: {
    respBody: '请求中'
  },
  onShow() {
    lyla
      .get('https://randomuser.me/api/', {
        headers: {
          foo: 'bar'
        }
      })
      .then((resp) => {
        console.log('resp', resp.headers, resp.body, resp.json)
        this.setData({
          respBody: JSON.stringify(resp.json)
        })
      })
  }
})
