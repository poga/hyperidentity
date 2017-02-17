const mkdirp = require('mkdirp')
const raf = require('random-access-file')
const cmds = require('../cmd')
const path = require('path')
const hyperdrive = require('hyperdrive')
const level = require('level')

var argv = require('minimist')(process.argv.slice(2))

doCommand(argv._.shift())

function doCommand (cmd) {
  var dir = argv._[0]
  if (cmd === 'init') return doInit(dir)

  openArchive(dir, function (err, archive) {
    if (err) throw err

    switch (cmd) {
      case 'info':
        cmds.info(archive, function (err, archive) {
          if (err) throw err
        })
        break
      case 'login':
        cmds.login(archive, argv._[1], function (err) {
          if (err) throw err
        })
        break
      case 'online':
        cmds.up(archive)
        break
    }
  })
}

function doInit (dir) {
  mkdirp(dir, function (err) {
    if (err) throw err
    cmds.init(dir, {foo: 'bar'}, function (err, id, archive, importStatus) {
      if (err) throw (err)

      console.log(id.key.toString('hex'))
      importStatus.on('error', err => { throw err })
      importStatus.on('file imported', function (s) {
        console.log('file imported %s %s', s.path, s.mode)
      })
    })
  })
}

function openArchive (dir, cb) {
  var drive = hyperdrive(level(path.join(dir, '.hyperidentity')))
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
