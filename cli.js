const hyperdrive = require('hyperdrive')
const level = require('level')
const hyperidentity = require('.')
const raf = require('random-access-file')
const path = require('path')
const mkdirp = require('mkdirp')

var argv = require('minimist')(process.argv.slice(2))

var cmd = argv._.shift()

console.log(argv)

switch (cmd) {
  case 'init':
    var dir = argv._[0]
    mkdirp(dir, function (err) {
      if (err) throw err
      init(dir, {foo: 'bar'}, function (err, id, archive) {
        if (err) throw (err)

        console.log(id.key.toString('hex'))
      })
    })
    break
  case 'info':
    info(argv._[0], function (err, archive) {
      if (err) throw err
    })
    break
  case 'login':
    login(argv._[0], argv._[1], function (err) {
      if (err) throw err
    })
}

// commands

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
  openArchive(getDrive(dir), function (err, archive) {
    if (err) return cb(err)

    console.log('key', archive.key.toString('hex'))
    cb(null, archive)
  })
}

function login (dir, token, cb) {
  openArchive(getDrive(dir), function (err, archive) {
    if (err) return cb(err)
    var id = hyperidentity(archive)
    id.acceptLinkToken(token, cb)
  })
}

// helpers

function getDrive (dir) {
  return hyperdrive(level(path.join(dir, '.hyperidentity')))
}

function openArchive (drive, cb) {
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
