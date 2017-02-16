const tape = require('tape')
const cmds = require('../cmd')
const tmp = require('tmp')
const signatures = require('sodium-signatures')
const hyperidentity = require('..')
const hyperdrive = require('hyperdrive')
const memdb = require('memdb')
const collect = require('collect-stream')

tape('init', function (t) {
  var dir = tmp.dirSync()
  cmds.init(dir.name, {foo: 'bar'}, (err, id, archive) => {
    t.error(err)
    t.ok(id)
    t.ok(archive)

    collect(archive.createFileReadStream('identity.json'), (err, data) => {
      t.error(err)
      t.same(JSON.parse(data), {foo: 'bar'})
    })
    t.end()
  })
})

tape('info', function (t) {
  var dir = tmp.dirSync()
  cmds.init(dir.name, {foo: 'bar'}, (err, id, archive) => {
    t.error(err)

    // close the leveldb used by the archive.
    // in real world each command is in seperate process so we don't have to do this.
    archive.drive.core._db.close(() => {
      // then execute next command
      cmds.info(dir.name, (err, archive) => {
        t.error(err)
        t.ok(archive)
        t.end()
      })
    })
  })
})

tape('login', function (t) {
  var dir = tmp.dirSync()
  var service = signatures.keyPair()
  var serviceArchive = hyperdrive(memdb()).createArchive()

  cmds.init(dir.name, {foo: 'bar'}, (err, id, archive) => {
    t.error(err)

    var ID = hyperidentity(archive)
    var token = ID.serviceLinkToken(service, serviceArchive.key)

    // token will be encoded as base64 to transmit across network
    token = new Buffer(token).toString('base64')

    archive.drive.core._db.close(() => {
      cmds.login(dir.name, token, (err, archive) => {
        t.error(err)

        // check response is written into the ID archive
        collect(archive.createFileReadStream(`proofs/${service.publicKey.toString('hex')}`), (err, data) => {
          t.error(err)
          t.ok(data)
          t.end()
        })
      })
    })
  })
})
