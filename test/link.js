const tape = require('tape')
const hyperdrive = require('hyperdrive')
const memdb = require('memdb')
const hyperIdentity = require('..')
const pump = require('pump')
const Readable = require('stream').Readable
const collect = require('collect-stream')

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

tape('fork', function (t) {
  var drive = hyperdrive(memdb())
  var archive = drive.createArchive()
  pump(source('hello world'), archive.createFileWriteStream('hello.txt'), test)

  var id = hyperIdentity(drive)

  function test (err) {
    t.error(err)

    id.link('linked', archive.key, err => {
      t.error(err)

      id.fork('linked', 'linked-fork', (err, key) => {
        t.error(err)
        t.ok(key)

        collect(id.createFileReadStream('links/linked-fork'), (err, data) => {
          t.error(err)
          t.same(JSON.parse(data.toString()).l, key.toString('hex'))
          t.end()
        })
      })
    })
  }
})

function source (str) {
  var s = new Readable()
  s.push(str)
  s.push(null)
  return s
}
