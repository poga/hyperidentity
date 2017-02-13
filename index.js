const Readable = require('stream').Readable
const pump = require('pump')
const collect = require('collect-stream')
const ln = require('hyperdrive-ln')
const proof = require('./proof')
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
  var payload = proof.msg(service, {publicKey: this._archive.key}, archiveKey)

  return JSON.stringify({
    service: service.publicKey,
    payload: payload
  }, bufferJSON.replacer)
}

HyperIdentity.prototype.acceptLinkToken = function (token, cb) {
  var archive = this._archive
  token = JSON.parse(token, bufferJSON.reviver)
  var secretKey = this._archive.metadata.secretKey
  var link = proof.openMsg({publicKey: token.service}, {secretKey}, token.payload)

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
    return proof.msg(self, service, 'APPROVED')
  }
}

HyperIdentity.prototype.verifyAcceptingness = function (service, cb) {
  var archive = this._archive
  archive.list((err, entries) => {
    if (err) return cb(err)

    for (var i = 0; i < entries.length; i++) {
      if (entries[i].name === proofPath(service.publicKey)) {
        collect(archive.createFileReadStream(proofPath(service.publicKey)), (err, data) => {
          if (err) return cb(err)
          cb(null, proof.openMsg({publicKey: archive.key}, {secretKey: service.secretKey}, JSON.parse(data, bufferJSON.reviver)))
        })

        break
      }
    }
  })
}

// TODO: find a better name for this
HyperIdentity.prototype.link = function (name, key, cb) {
  ln.link(this._archive, 'links/' + name, key, cb)
}

HyperIdentity.prototype.readlink = function (name, cb) {
  return ln.readlink(this._archive, 'links/' + name, cb)
}

HyperIdentity.prototype.replicate = function (opts) {
  return this._archive.replicate(opts)
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
