module.exports = HyperIdentity

function HyperIdentity (drive, key, opts) {
  if (!(this instanceof HyperIdentity)) return new HyperIdentity(drive)

  this._drive = drive
  this._archive = this._drive.createArchive(key)
  this.id = this._archive.id
  this.key = this._archive.key
  this.discoveryKey = this._archive.discoveryKey
}

HyperIdentity.prototype.replicate = function (opts) {
  return this._archive.replicate(opts)
}

