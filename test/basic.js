const tape = require('tape')
const hyperdrive = require('hyperdrive')
const memdb = require('memdb')
const hyperIdentity = require('..')
const collect = require('collect-stream')

tape('basic', function (t) {
  var drive = hyperdrive(memdb())
  var id = hyperIdentity(drive)
  id.setMeta({foo: 'bar'}, err => {
    t.error(err)

    id.meta((err, meta) => {
      t.error(err)
      t.same(JSON.parse(meta), {foo: 'bar'})
      t.end()
    })
  })
})

tape('challenge', function (t) {
  var drive = hyperdrive(memdb())
  var id = hyperIdentity(drive)
  var nonce = Math.floor(Math.random() * 1000)
  var email = 'test@example.com'
  var serviceName = 'some_service'

  var list = id.list()
  list.on('data', x => {
    t.same(x.name, `proofs/${serviceName}`)

    collect(id.createFileReadStream(x), (err, data) => {
      t.error(err)
      t.same(JSON.parse(data), {
        nonce: nonce + 1,
        email: email
      })
      t.end()
    })
  })

  id.responseChallenge(serviceName, nonce, email, err => {
    t.error(err)
  })
})
