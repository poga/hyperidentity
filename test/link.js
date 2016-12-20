const tape = require('tape')
const hyperdrive = require('hyperdrive')
const memdb = require('memdb')
const hyperIdentity = require('..')

tape('link', function (t) {
  var drive = hyperdrive(memdb())
  var id = hyperIdentity(drive)
  id.link('linked', 'fakeKey', err => {
    t.error(err)

    id.readlink('linked', (err, key) => {
      t.error(err)
      t.same(key, 'fakeKey')
      t.end()
    })
  })
})

