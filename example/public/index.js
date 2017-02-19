/* global $ */
$('#login').click(function (e) {
  $.ajax({
    url: '/login',
    dataType: 'json',
    data: JSON.stringify({key: $('#key').val()}),
    contentType: 'application/json; charset=utf-8',
    type: 'POST'
  }).done(function (data) {
    console.log(data)
    $('#token').text(data.result)

    function waitForVerify () {
      $.ajax({
        url: '/verifyLogin',
        dataType: 'json',
        data: JSON.stringify({key: $('#key').val()}),
        contentType: 'application/json; charset=utf-8',
        type: 'POST'
      }).done(function (data) {
        console.log(data)
        if (data.user) {
          $('#user').text(JSON.stringify(data.user))
        } else {
          waitForVerify()
        }
      }).fail(() => {
        console.log('failed')
        waitForVerify()
      })
    }
    waitForVerify()
  })
})
