const Readable = require('stream').Readable
const pump = require('pump')
const collect = require('collect-stream')
const ln = require('hyperdrive-ln')
const encrypted = require('encrypted-message')
const bufferJSON = require('buffer-json')

const META_FILE = '.identity.json'
const ACCEPT_MESSAGE = 'APPROVED'

module.exports = HyperIdentity

function HyperIdentity (archive) {
  if (!(this instanceof HyperIdentity)) return new HyperIdentity(archive)

  this.archive = archive
  this.key = archive.key
}

HyperIdentity.prototype.setMeta = function (meta, cb) {
  pump(source(JSON.stringify(meta)), this.archive.createFileWriteStream(META_FILE), cb)
}

HyperIdentity.prototype.getMeta = function (cb) {
  collect(this.archive.createFileReadStream(META_FILE), cb)
}

HyperIdentity.prototype.serviceLinkToken = function (service, archiveKey) {
  var payload = encrypted.message(service.keyPair, {publicKey: this.archive.key}, archiveKey)

  return JSON.stringify({
    service: {
      publicKey: service.keyPair.publicKey,
      meta: service.meta
    },
    payload: payload
  }, bufferJSON.replacer)
}

HyperIdentity.prototype.acceptLinkToken = function (token, cb) {
  var archive = this.archive
  token = JSON.parse(token, bufferJSON.reviver)
  var secretKey = this.archive.metadata.secretKey
  var link = encrypted.openMessage({publicKey: token.service.publicKey}, {secretKey}, token.payload)

  if (!link) return cb(new Error('unable to read token'))

  var resp = JSON.stringify(createResponse(
    { publicKey: token.service.publicKey }, // service
    { secretKey: archive.metadata.secretKey } // self
  ), bufferJSON.replacer)

  pump(source(resp), archive.createFileWriteStream(proofPath(token.service.publicKey)), err => {
    if (err) return cb(err)

    ln.link(archive, linkPath(token.service), link, token.service.meta, cb)
  })

  function createResponse (service, self) {
    return encrypted.message(self, service, ACCEPT_MESSAGE)
  }
}

HyperIdentity.prototype.verifyAcceptingness = function (service, cb) {
  var archive = this.archive
  archive.list((err, entries) => {
    if (err) return cb(err)

    var found = false
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].name === proofPath(service.keyPair.publicKey)) {
        collect(archive.createFileReadStream(proofPath(service.keyPair.publicKey)), (err, data) => {
          if (err) return cb(err)
          var msg = encrypted.openMessage({publicKey: archive.key}, {secretKey: service.keyPair.secretKey}, JSON.parse(data, bufferJSON.reviver))
          cb(null, msg.toString() === ACCEPT_MESSAGE)
        })

        found = true
        break
      }
    }

    if (!found) cb(null) // no error, but not verified
  })
}

function source (str) {
  var s = new Readable()
  s.push(str)
  s.push(null)
  return s
}

function proofPath (key) {
  return `.proofs/${key.toString('hex')}`
}

function linkPath (key) {
  return `.links/${key.toString('hex')}`
}
