const tape = require('tape')
const hyperdrive = require('hyperdrive')
const memdb = require('memdb')
const swarm = require('hyperdrive-archive-swarm')
const hyperIdentity = require('..')

tape('swarm', function (t) {
  var drive = hyperdrive(memdb())
  var id1 = hyperIdentity(drive)
  var sw1 = swarm(id1)
  id1.setMeta({foo: 'bar'}, err => {
    t.error(err)

    var drive2 = hyperdrive(memdb())
    var id2 = hyperIdentity(drive2, id1.key)
    var sw2 = swarm(id2)
    id2.meta((err, meta) => {
      t.error(err)
      t.same(JSON.parse(meta), {foo: 'bar'})
      sw1.close()
      sw2.close()
      t.end()
    })
  })
})
