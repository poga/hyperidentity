const tape = require('tape')
const signatures = require('sodium-signatures')
const proof = require('../proof')

tape('token', function (t) {
  var u1 = signatures.keyPair()
  var u2 = signatures.keyPair()

  var msg = proof.msg(u1, u2, 'KEY')
  t.same(proof.openMsg(u1, u2, msg).toString(), 'KEY')
  t.end()
})
