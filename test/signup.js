const tape = require('tape')
const identity = require('..').identity
const service = require('..').service
const hyperdrive = require('hyperdrive')
const memdb = require('memdb')
const signatures = require('sodium-signatures')
const collect = require('collect-stream')
const tmp = require('tmp')

tape('signup', function (t) {
  var drive = hyperdrive(memdb())

  var ID = identity(drive.createArchive())
  var service = signatures.keyPair()

  // 1. user provide its ID's public key to service
  // 2. service create a new archive to store user's data
  // 3. service create a link request token for the user
  var linkToken = ID.serviceLinkToken(service, '<ARCHIVE_KEY>')

  // 4. user received the token, pass it to its ID,
  //    ID should verify the token and write a response to its archive
  ID.acceptLinkToken(linkToken, err => {
    t.error(err)

    // check response is written to the ID archive
    collect(ID.archive.createFileReadStream(`.proofs/${service.publicKey.toString('hex')}`), (err, data) => {
      t.error(err)
      t.ok(data)

      // 5. service watch the archive list, find the proof, verify it
      ID.verifyAcceptingness(service, (err, verified) => {
        t.error(err)
        t.ok(verified)

        // 6. and it's done!
        t.end()
      })
    })
  })
})

tape('verification timeout', function (t) {
  var drive = hyperdrive(memdb())

  var ID = identity(drive.createArchive())

  var serviceDrive = hyperdrive(memdb())
  var dir = tmp.dirSync()

  var idOnServiceSide = identity(serviceDrive.createArchive(ID.key))
  var hs = service(serviceDrive, {name: 'test service'}, dir.name)

  hs.verify(idOnServiceSide, {timeout: 5000}, (err, verified, meta) => {
    t.same(err, new Error('Unable to verify in time'))
    t.notOk(verified)
    t.notOk(meta)

    t.end()
  })
})
