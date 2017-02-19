const tape = require('tape')
const identity = require('..').identity
const hyperdrive = require('hyperdrive')
const memdb = require('memdb')
const signatures = require('sodium-signatures')
const collect = require('collect-stream')
const {mockService} = require('./helper')

tape('signup', function (t) {
  var drive = hyperdrive(memdb())

  var ID = identity(drive.createArchive())
  var serviceKeyPair = signatures.keyPair()

  var mockedService = mockService(serviceKeyPair, 'test_service')
  // 1. user provide its ID's public key to service
  // 2. service create a new archive to store user's data
  // 3. service create a link request token for the user
  var linkToken = ID.serviceLinkToken(mockedService, '<ARCHIVE_KEY>')

  // 4. user received the token, pass it to its ID,
  //    ID should verify the token and write a response to its archive
  ID.acceptLinkToken(linkToken, err => {
    t.error(err)

    // check response is written to the ID archive
    collect(ID.archive.createFileReadStream(`.proofs/${serviceKeyPair.publicKey.toString('hex')}`), (err, data) => {
      t.error(err)
      t.ok(data)

      // 5. service watch the archive list, find the proof, verify it
      ID.verifyAcceptingness(mockedService, (err, verified) => {
        t.error(err)
        t.ok(verified)

        // 6. and it's done!
        t.end()
      })
    })
  })
})
