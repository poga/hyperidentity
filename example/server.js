const express = require('express')
const bodyParser = require('body-parser')
const hyperdrive = require('hyperdrive')
const level = require('level')
const hyperservice = require('..').service

var drive = hyperdrive(level('./service'))
var app = express()
var service = hyperservice(
  drive,
  {name: 'example service'},
  './storage'
)

console.log('service', service.keyPair.publicKey.toString('hex'))

app.use(express.static('public'))
app.use(bodyParser.json())

app.post('/login', function (req, res) {
  var key = req.body.key
  console.log(key)
  var id = service.createIdentity(key)
  var token = service.issue(id)

  res.json({result: new Buffer(token).toString('base64')})
})

app.post('/verifyLogin', function (req, res) {
  var key = req.body.key
  console.log('verifying', key)
  var id = service.createIdentity(key)
  service.verify(id, (err, verified, meta) => {
    if (err) throw err

    if (!verified) return res.json({verified: false})

    res.json({user: meta.toString()})
  })
})

app.listen(3000, function () {
  console.log('listening')
})
