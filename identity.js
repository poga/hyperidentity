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
  var payload = encrypted.message(service, {publicKey: this.archive.key}, archiveKey)

  return JSON.stringify({
    service: service.publicKey,
    payload: payload
  }, bufferJSON.replacer)
}

HyperIdentity.prototype.acceptLinkToken = function (token, cb) {
  var archive = this.archive
  token = JSON.parse(token, bufferJSON.reviver)
  var secretKey = this.archive.metadata.secretKey
  var link = encrypted.openMessage({publicKey: token.service}, {secretKey}, token.payload)

  if (!link) return cb(new Error('unable to read token'))

  var resp = JSON.stringify(createResponse(
    { publicKey: token.service }, // service
    { secretKey: archive.metadata.secretKey } // self
  ), bufferJSON.replacer)

  pump(source(resp), archive.createFileWriteStream(proofPath(token.service)), err => {
    if (err) return cb(err)

    ln.link(archive, linkPath(token.service), link, cb)
  })

  function createResponse (service, self) {
    return encrypted.message(self, service, ACCEPT_MESSAGE)
  }
}

HyperIdentity.prototype.verifyAcceptingness = function (service, opts, cb) {
  if (cb === undefined) return this.verifyAcceptingness(service, {}, opts)

  var timeout = opts.timeout || 5000 // reject if no connection after 5 seconds
  var timedOut = false // is the verification already timed out?

  var archive = this.archive
  var verifyTimeout = setTimeout(function () {
    timedOut = true
    cb(new Error('Unable to verify in time'), false)
  }, timeout)

  archive.list((err, entries) => {
    if (timedOut) return false // do nothing if already timed out
    clearTimeout(verifyTimeout)

    if (err) return cb(err)

    var found = false
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].name === proofPath(service.publicKey)) {
        collect(archive.createFileReadStream(proofPath(service.publicKey)), (err, data) => {
          if (err) return cb(err)
          var msg = encrypted.openMessage({publicKey: archive.key}, {secretKey: service.secretKey}, JSON.parse(data, bufferJSON.reviver))
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
