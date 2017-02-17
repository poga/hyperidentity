const hyperidentity = require('.')
const raf = require('random-access-file')
const path = require('path')
const swarm = require('hyperdiscovery')
const importFiles = require('hyperdrive-import-files')
const hyperdrive = require('hyperdrive')
const level = require('level')

function up (archive) {
  return swarm(archive)
}

function init (dir, meta, cb) {
  var drive = hyperdrive(level(path.join(dir, '.hyperidentity')))
  var archive = drive.createArchive({
    file: name => raf(path.join(dir, name))
  })

  var id = hyperidentity(archive)
  id.setMeta(meta, done)

  function done (err) {
    console.log('done')
    if (err) cb(err)

    var importStatus = importFiles(archive, dir, {ignore: [path => path.indexOf('.hyperidentity') !== -1], index: true}, err => {
      cb(err, id, archive, importStatus)
    })
  }
}

function info (archive, cb) {
  cb(null, {key: archive.key})
}

function login (archive, token, cb) {
  var id = hyperidentity(archive)
  var decoded = new Buffer(token, 'base64')
  id.acceptLinkToken(decoded, err => {
    if (err) return cb(err)

    cb(null, archive)
  })
}

module.exports = {init, up, info, login}
