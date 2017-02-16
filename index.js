const Readable = require('stream').Readable
const pump = require('pump')
const collect = require('collect-stream')
const ln = require('hyperdrive-ln')
const encrypted = require('encrypted-message')
const bufferJSON = require('buffer-json')

module.exports = HyperIdentity

function HyperIdentity (archive) {
  if (!(this instanceof HyperIdentity)) return new HyperIdentity(archive)

  this._archive = archive
  this.id = this._archive.id
  this.key = this._archive.key
  this.discoveryKey = this._archive.discoveryKey
}

HyperIdentity.prototype.list = function (opts, cb) {
  return this._archive.list(opts, cb)
}

HyperIdentity.prototype.createFileReadStream = function (entry, opts) {
  return this._archive.createFileReadStream(entry, opts)
}

HyperIdentity.prototype.setMeta = function (meta, cb) {
  pump(source(JSON.stringify(meta)), this._archive.createFileWriteStream('identity.json'), cb)
}

HyperIdentity.prototype.getMeta = function (cb) {
  collect(this._archive.createFileReadStream('identity.json'), cb)
}

HyperIdentity.prototype.serviceLinkToken = function (service, archiveKey) {
  var payload = encrypted.message(service, {publicKey: this._archive.key}, archiveKey)

  return JSON.stringify({
    service: service.publicKey,
    payload: payload
  }, bufferJSON.replacer)
}

HyperIdentity.prototype.acceptLinkToken = function (token, cb) {
  var archive = this._archive
  token = JSON.parse(token, bufferJSON.reviver)
  var secretKey = this._archive.metadata.secretKey
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
    return encrypted.message(self, service, 'APPROVED')
  }
}

HyperIdentity.prototype.verifyAcceptingness = function (service, cb) {
  var archive = this._archive
  archive.list((err, entries) => {
    if (err) return cb(err)

    var found = false
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].name === proofPath(service.publicKey)) {
        collect(archive.createFileReadStream(proofPath(service.publicKey)), (err, data) => {
          if (err) return cb(err)
          var msg = encrypted.openMessage({publicKey: archive.key}, {secretKey: service.secretKey}, JSON.parse(data, bufferJSON.reviver))
          cb(null, msg.toString() === 'APPROVED')
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
  return `proofs/${key.toString('hex')}`
}

function linkPath (key) {
  return `links/${key.toString('hex')}`
}
