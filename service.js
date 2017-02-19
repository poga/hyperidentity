const identity = require('./identity')
const signatures = require('sodium-signatures')
const swarm = require('hyperdiscovery')
const path = require('path')
const raf = require('random-access-file')

function HyperService (drive, meta, storagePath, keyPair) {
  if (!(this instanceof HyperService)) return new HyperService(drive, meta, storagePath, keyPair)

  this.keyPair = keyPair || signatures.keyPair()
  this.meta = meta
  this.path = storagePath
  this._drive = drive
  this._archivesForID = {}
  this._connections = {}
}

HyperService.prototype.createIdentity = function (key) {
  var archive = this._drive.createArchive(key, {
    file: name => raf(path.join(this.path, key.toString('hex'), name))
  })
  return identity(archive)
}

HyperService.prototype.issue = function (identity) {
  return identity.serviceLinkToken(this.keyPair, this._createServiceArchive(identity).key)
}

HyperService.prototype.verify = function (identity, cb) {
  var sw = connect(identity)

  identity.verifyAcceptingness(this.keyPair, (err, ok) => {
    if (err) return done(err)
    if (ok) {
      identity.getMeta((err, meta) => {
        if (err) return done(err)

        done(null, true, meta)
      })
    } else {
      done(null, false)
    }
  })

  function done (err, verified, meta) {
    sw.close()
    cb(err, verified, meta)
  }
}

HyperService.prototype._createServiceArchive = function (identity) {
  var archive = this._drive.createArchive()
  this._archivesForID[identity.key] = archive
  return archive
}

module.exports = HyperService

function connect (identity) {
  return swarm(identity.archive)
}
