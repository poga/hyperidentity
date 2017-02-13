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

    var loop = setInterval(function () {
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
          clearInterval(loop)
        }
      }).fail(console.error)
    }, 10000)
  })
})
