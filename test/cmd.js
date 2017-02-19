const tape = require('tape')
const cmds = require('../cmd')
const tmp = require('tmp')
const signatures = require('sodium-signatures')
const identity = require('..').identity
const hyperdrive = require('hyperdrive')
const memdb = require('memdb')
const collect = require('collect-stream')
const fs = require('fs')
const path = require('path')
const pump = require('pump')
const Readable = require('stream').Readable
const ln = require('hyperdrive-ln')
const swarm = require('hyperdiscovery')

tape('init', function (t) {
  var dir = tmp.dirSync()
  cmds.init(dir.name, {foo: 'bar'}, (err, id, archive) => {
    t.error(err)
    t.ok(id)
    t.ok(archive)

    collect(archive.createFileReadStream('identity.json'), (err, data) => {
      t.error(err)
      t.same(JSON.parse(data), {foo: 'bar'})
      t.end()
    })
  })
})

tape('init and import', function (t) {
  var dir = tmp.dirSync()
  fs.writeFileSync(path.join(dir.name, 'text.txt'), 'hello')

  cmds.init(dir.name, {foo: 'bar'}, (err, id, archive) => {
    t.error(err)
    t.ok(id)
    t.ok(archive)

    collect(archive.createFileReadStream('text.txt'), (err, data) => {
      t.error(err)
      t.same(data.toString(), 'hello')
      t.end()
    })
  })
})

tape('info', function (t) {
  var dir = tmp.dirSync()
  cmds.init(dir.name, {foo: 'bar'}, (err, id, archive) => {
    t.error(err)

    cmds.info(archive, (err, info) => {
      t.error(err)
      t.same(info.key, archive.key)
      t.end()
    })
  })
})

tape('login', function (t) {
  var dir = tmp.dirSync()
  var service = signatures.keyPair()
  var serviceArchive = hyperdrive(memdb()).createArchive()

  cmds.init(dir.name, {foo: 'bar'}, (err, id, archive) => {
    t.error(err)

    var ID = identity(archive)
    var token = ID.serviceLinkToken(service, serviceArchive.key)

    // token will be encoded as base64 to transmit across network
    token = new Buffer(token).toString('base64')

    cmds.login(archive, token, (err, archive) => {
      t.error(err)

      // check response is written into the ID archive
      collect(archive.createFileReadStream(`.proofs/${service.publicKey.toString('hex')}`), (err, data) => {
        t.error(err)
        t.ok(data)
        t.end()
      })
    })
  })
})

tape('up', function (t) {
  var dir = tmp.dirSync()
  var service = signatures.keyPair()
  var serviceArchive = hyperdrive(memdb()).createArchive()
  var sw = swarm(serviceArchive)
  pump(source('hello'), serviceArchive.createFileWriteStream('hello.txt'), err => {
    t.error(err)

    setup()
  })

  // setup an archive with a linked archive
  function setup () {
    cmds.init(dir.name, {foo: 'bar'}, (err, id, archive, _, drive) => {
      t.error(err)

      ln.link(archive, `.links/${service.publicKey.toString('hex')}`, serviceArchive.key, err => {
        t.error(err)

        doTest(drive, archive)
      })
    })
  }

  function doTest (drive, archive) {
    var clonedTo = path.join(dir.name, 'up_test')
    cmds.up(drive, archive, {clone_path: clonedTo}, (err, conns) => {
      t.error(err)
      t.equal(conns.length, 2)
      t.equal(conns[1].archive.key, archive.key)

      collect(conns[0].archive.createFileReadStream('hello.txt'), (err, data) => {
        t.error(err)
        t.equal(data.toString(), 'hello')

        fs.stat(path.join(clonedTo, 'hello.txt'), (err, stat) => {
          t.error(err)
          t.ok(stat)
          done(conns)
        })
      })
    })
  }

  function done (conns) {
    cmds.down(conns, err => {
      t.error(err)
      sw.close(() => {
        t.end()
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
