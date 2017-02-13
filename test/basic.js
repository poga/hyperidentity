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

    id.getMeta((err, meta) => {
      t.error(err)
      t.same(JSON.parse(meta), {foo: 'bar'})
      t.end()
    })
  })
})

