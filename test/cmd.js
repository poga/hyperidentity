const tape = require('tape')
const cmds = require('../cmd')
const tmp = require('tmp')
const signatures = require('sodium-signatures')
const hyperidentity = require('..')
const hyperdrive = require('hyperdrive')
const memdb = require('memdb')
const collect = require('collect-stream')
const fs = require('fs')
const path = require('path')

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

    var ID = hyperidentity(archive)
    var token = ID.serviceLinkToken(service, serviceArchive.key)

    // token will be encoded as base64 to transmit across network
    token = new Buffer(token).toString('base64')

    cmds.login(archive, token, (err, archive) => {
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
