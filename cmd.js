const identity = require('.').identity
const raf = require('random-access-file')
const path = require('path')
const swarm = require('hyperdiscovery')
const importFiles = require('hyperdrive-import-files')
const hyperdrive = require('hyperdrive')
const level = require('level')
const ln = require('hyperdrive-ln')
const async = require('async')

const DEFAULT_CLONE_PATH = '~/.hyperidentity-linked'

function up (drive, archive, opts, cb) {
  if (cb === undefined) return up(drive, archive, {}, opts)

  var clonePath = opts.clone_path || DEFAULT_CLONE_PATH

  var self = swarm(archive)

  // also replicate all linked archives
  archive.list((err, entries) => {
    if (err) return cb(err)

    var links = entries.filter(e => e.name.startsWith('.links'))

    async.map(
      links,
      (entry, cb) => {
        ln.readlink(archive, entry.name, cb)
      },
      (err, links) => {
        if (err) return cb(err)

        var conns = links.reduce((result, link) => { return result.concat([clone(link.link)]) }, [])
        // push self
        conns.push({archive, sw: self})

        cb(null, conns)
      }
    )
  })

  function clone (key) {
    var archive = drive.createArchive(key, { file: name => raf(path.join(clonePath, name)) })
    var sw = swarm(archive)

    return {archive, sw}
  }
}

// close all swarm connection in a `up` result.
// only needed for testing.
function down (conns, cb) {
  async.each(conns, close, err => {
    if (err) return cb(err)

    cb()
  })

  function close (r, cb) {
    r.sw.close(cb)
  }
}

function init (dir, meta, cb) {
  var drive = hyperdrive(level(path.join(dir, '.hyperidentity')))
  var archive = drive.createArchive({
    file: name => raf(path.join(dir, name))
  })

  var id = identity(archive)
  id.setMeta(meta, done)

  function done (err) {
    if (err) cb(err)

    var importStatus = importFiles(archive, dir, {ignore: [path => path.indexOf('.hyperidentity') !== -1], index: true}, err => {
      cb(err, id, archive, importStatus, drive)
    })
  }
}

function info (archive, cb) {
  var result = {key: archive.key, links: []}
  archive.list((err, entries) => {
    if (err) return cb(err)

    var links = entries.filter(e => e.name.startsWith('.links'))

    async.map(
      links,
      (entry, cb) => {
        ln.readlink(archive, entry.name, cb)
      },
      (err, links) => {
        if (err) return cb(err)
        result.links = links

        cb(null, result)
      }
    )
  })
}

function login (archive, encodedToken, cb) {
  var id = identity(archive)
  var decoded = new Buffer(encodedToken, 'base64')
  id.acceptLinkToken(decoded, err => {
    if (err) return cb(err)

    cb(null, archive)
  })
}

module.exports = {init, up, down, info, login}
