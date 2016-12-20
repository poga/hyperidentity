const Readable = require('stream').Readable
const pump = require('pump')
const collect = require('collect-stream')
const ln = require('hyperdrive-ln')

module.exports = HyperIdentity

function HyperIdentity (drive, key) {
  if (!(this instanceof HyperIdentity)) return new HyperIdentity(drive, key)

  this._drive = drive
  this._archive = this._drive.createArchive(key, {sparse: true})
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

HyperIdentity.prototype.meta = function (cb) {
  collect(this._archive.createFileReadStream('identity.json'), cb)
}

HyperIdentity.prototype.responseChallenge = function (name, nonce, email, cb) {
  pump(source(JSON.stringify({
    nonce: nonce + 1,
    email: email
  })), this._archive.createFileWriteStream(`proofs/${name}`), cb)
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
