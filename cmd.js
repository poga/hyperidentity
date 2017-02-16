const hyperdrive = require('hyperdrive')
const level = require('level')
const hyperidentity = require('.')
const raf = require('random-access-file')
const path = require('path')
const swarm = require('hyperdiscovery')

function up (dir, cb) {
  openArchive(dir, function (err, archive) {
    if (err) cb(err)

    cb(null, swarm(archive))
  })
}

function init (dir, meta, cb) {
  var drive = getDrive(dir)
  var archive = drive.createArchive({
    file: name => raf(path.join(dir, name))
  })

  var id = hyperidentity(archive)
  id.setMeta(meta, done)

  function done (err) {
    if (err) cb(err)

    cb(null, id, archive)
  }
}

function info (dir, cb) {
  openArchive(dir, function (err, archive) {
    if (err) return cb(err)

    cb(null, archive)
  })
}

function login (dir, token, cb) {
  openArchive(dir, function (err, archive) {
    if (err) return cb(err)
    var id = hyperidentity(archive)
    var decoded = new Buffer(token, 'base64')
    id.acceptLinkToken(decoded, err => {
      if (err) return cb(err)

      cb(null, archive)
    })
  })
}

module.exports = {init, up, info, login}

// helpers

function getDrive (dir) {
  return hyperdrive(level(path.join(dir, '.hyperidentity')))
}

function openArchive (dir, cb) {
  var drive = getDrive(dir)
  drive.core.list((err, keys) => {
    // assume 2 keys
    if (err) return cb(err)

    var archive
    firstTry()

    function firstTry () {
      archive = drive.createArchive(keys[1], {
        file: name => raf(path.join(dir, name))
      })
      var openTimeout = setTimeout(secondTry, 150)

      archive.open(function (err) {
        clearTimeout(openTimeout)

        if (!err) return doneCreateArchive()
        var badKey = err && (err.message.indexOf('Unknown message type') > -1 || err.message.indexOf('Key not found in database') > -1)
        if (err && !badKey) return cb(err)

        secondTry()
      })
    }

    function secondTry () {
      archive = drive.createArchive(keys[0], {
        file: name => raf(path.join(dir, name))
      })
      doneCreateArchive()
    }

    function doneCreateArchive () {
      archive.open(function (err) {
        if (err) return cb(err)

        cb(null, archive)
      })
    }
  })
}
