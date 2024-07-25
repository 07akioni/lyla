// copy @lylajs/wx/dist to here
const { lyla } = require('./lyla')

// index.js
Page({
  data: {
    respBody: '请求中'
  },
  onShow() {
    lyla
      .post('https://chat.deepseek.com/api/v0/chat/completions', {
        headers: {
          Authorization: 'Bearer xxx'
        },
        json: {
          message: 'Hello',
          stream: true,
          model_preference: null,
          model_class: 'deepseek_chat',
          temperature: 0
        },
        onDownloadProgress({ detail }) {
          console.log('!!!1', detail.responseText)
        }
      })
      .then((resp) => {
        console.log('!!!2', resp.body)
        this.setData({
          respBody: resp.body
        })
      })
  }
})
