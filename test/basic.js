const tape = require('tape')
const hyperdrive = require('hyperdrive')
const memdb = require('memdb')
const identity = require('..').identity

tape('meta', function (t) {
  var drive = hyperdrive(memdb())
  var id = identity(drive.createArchive())
  id.setMeta({foo: 'bar'}, err => {
    t.error(err)

    id.getMeta((err, meta) => {
      t.error(err)
      t.same(JSON.parse(meta), {foo: 'bar'})
      t.end()
    })
  })
})

