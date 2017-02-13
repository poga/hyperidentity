const express = require('express')
const bodyParser = require('body-parser')
const hyperdrive = require('hyperdrive')
const memdb = require('memdb')
const hyperidentity = require('..')
const signatures = require('sodium-signatures')
const swarm = require('hyperdiscovery')

var drive = hyperdrive(memdb())
var app = express()
var service = signatures.keyPair()
var serviceArchives = {}

console.log('service', service.publicKey.toString('hex'))

app.use(express.static('public'))
app.use(bodyParser.json())

app.post('/login', function (req, res) {
  var key = req.body.key
  console.log(key)
  var userArchive = drive.createArchive(key)
  var ID = hyperidentity(userArchive)

  var serviceArchive = drive.createArchive()
  serviceArchives[ID.key] = serviceArchive
  res.json({result: new Buffer(ID.serviceLinkToken(service, serviceArchive.key)).toString('base64')})
})

app.post('/verifyLogin', function (req, res) {
  var key = req.body.key
  console.log('verifying', key)
  var userArchive = drive.createArchive(key)
  var sw = swarm(userArchive)
  var ID = hyperidentity(userArchive)
  sw.on('connection', function (peer, type) {
    console.log('connected to', sw.connections.length, 'peers')
    peer.on('close', function () {
      console.log('peer disconnected')
    })
  })

  ID.verifyAcceptingness(service, (err, msg) => {
    console.log('verifyAcceptingness', err, msg)
    if (err) throw err
    if (msg) {
      console.log('received', msg.toString())
      console.log('get meta')
      ID.getMeta((err, meta) => {
        if (err) throw err
        console.log(meta)
        res.json({user: meta.toString()})

        sw.close()
      })
    } else {
      res.json({verified: false})
    }
  })
})

app.listen(3000, function () {
  console.log('listening')
})
