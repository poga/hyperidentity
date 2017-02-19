const tape = require('tape')
const hyperdrive = require('hyperdrive')
const memdb = require('memdb')
const tmp = require('tmp')
const service = require('..').service
const identity = require('..').identity

tape('signup', function (t) {
  var drive = hyperdrive(memdb())
  var dir = tmp.dirSync()

  var hs = service(drive, {name: 'test service'}, dir.name)

  var userDrive = hyperdrive(memdb())
  var ID = identity(userDrive.createArchive())
  ID.setMeta({name: 'user1'}, err => {
    t.error(err)

    test()
  })

  function test () {
    var token = hs.issue(ID)

    ID.acceptLinkToken(token, err => {
      t.error(err)

      hs.verify(ID, (err, verified, meta) => {
        t.error(err)
        t.ok(verified)
        t.same(JSON.parse(meta.toString()), {name: 'user1'})

        t.end()
      })
    })
  }
})
