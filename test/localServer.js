const tape = require('tape')
const hyperdrive = require('hyperdrive')
const memdb = require('memdb')
const localServer = require('../localServer')
const request = require('superagent')
const collect = require('collect-stream')
const Readable = require('stream').Readable
const pump = require('pump')

tape('unverified request', function (t) {
  var drive = hyperdrive(memdb())
  var archive = drive.createArchive()

  var app = localServer(archive)
  var server = app.listen(9064, function () {
    request
      .post('http://localhost:9064/foo/bar')
      .send(({data: {hello: 'world'}}))
      .end((err, res) => {
        t.error(err)
        t.same(res.body, {error: 'not verified'})

        collect(archive.createFileReadStream('/foo/bar'), (err, data) => {
          t.ok(err)
          t.notOk(data)

          server.close()
          t.end()
        })
      })
  })
})

tape('verified request', function (t) {
  var drive = hyperdrive(memdb())
  var archive = drive.createArchive()

  pump(source('foo'), archive.createFileWriteStream('.proof/test'), err => {
    t.error(err)

    var app = localServer(archive)
    var server = app.listen(9064, function () {
      request
        .post('http://localhost:9064/foo/bar')
        .send(({data: {hello: 'world'}}))
        .set('X-SERVICE-KEY', 'test')
        .end((err, res) => {
          t.error(err)
          t.same(res.body, {status: 'ok'})

          collect(archive.createFileReadStream('/foo/bar'), (err, data) => {
            t.error(err)
            t.same(JSON.parse(data), {hello: 'world'})

            server.close()
            t.end()
          })
        })
    })
  })
})

function source (str) {
  var s = new Readable()
  s.push(str)
  s.push(null)
  return s
}
