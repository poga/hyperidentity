const tape = require('tape')
const signatures = require('sodium-signatures')
const proof = require('../proof')

tape('token', function (t) {
  var u1 = signatures.keyPair()
  var u2 = signatures.keyPair()

  var msg = proof.msg(u1, u2, 'KEY')
  t.ok(proof.verifyMsg(u1, u2, msg))
  t.end()
})
