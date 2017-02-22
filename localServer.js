const express = require('express')
const bodyParser = require('body-parser')
const pump = require('pump')
const Readable = require('stream').Readable
const collect = require('collect-stream')

function localServer (archive) {
  var app = express()
  app.use(bodyParser.json())

  app.post('/*', function (req, res) {
    checkProof(req.get('X-SERVICE-KEY'), verified => {
      if (!verified) return res.json({error: 'not verified'})

      pump(source(JSON.stringify(req.body.data)), archive.createFileWriteStream(req.path), function (err) {
        if (err) return res.json({error: err})
        res.json({status: 'ok'})
      })
    })
  })

  app.get('/ping', function (req, res) {
    res.json({status: 'pong'})
  })

  return app

  function checkProof (key, cb) {
    collect(archive.createFileReadStream(`.proof/${key}`), (err, data) => {
      if (err) return cb(false)
      cb(true)
    })
  }
}

function source (str) {
  var s = new Readable()
  s.push(str)
  s.push(null)
  return s
}

module.exports = localServer
