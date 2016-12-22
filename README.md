# Hyperidentity

[![NPM Version](https://img.shields.io/npm/v/hyperidentity.svg)](https://www.npmjs.com/package/hyperfeed) [![JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)

Represent yourself with a [hyperdrive](https://github.com/mafintosh/hyperdrive) archive.

`npm i hyperidentity`

## Signup Flow

```js
var drive = hyperdrive(memdb())

// assume
var ID = hyperidentity(drive)
var service = signatures.keyPair()

// 1. user provide its ID's public key to service
//    so service can create the same ID object with hyperidentity(drive, key)
// 2. service create a new archive to store user's data
// 3. service create a link request token for the user, send to user
var linkToken = ID.serviceLinkToken(service, '<ARCHIVE_KEY>')

// 4. user received the token, pass it to its ID,
//    ID should verify the token and write a response to its archive
ID.acceptLinkToken(linkToken, err => {
  t.error(err)

  // check response is written to the ID archive
  collect(ID.createFileReadStream(`proofs/${service.publicKey.toString('hex')}`), (err, data) => {
    t.error(err)
    t.ok(data)

    // 5. service watch the archive list, find the proof, verify it
    ID.verifyAcceptingness(service, (err, verified) => {
      t.error(err)
      t.ok(verified)

      // 6. and it's done!
      t.end()
    })
  })
})
```

## API

#### `id = hyperidentity(drive, [key])`

Create a new identity

#### `stream = id.list(opts, [cb])`

list entries in the ID

#### `stream = id.createFileReadStream(entry, [opts])`

read a entry

#### `id.setMeta(meta, cb)`

Set metadata of the ID

#### `id.getMeta(cb)`

Get metadata of the ID

### Signup Flow

#### `token = id.serviceLinkToken(service, archiveKey)`

Service need to create a token for user to:

1. verify user really own the ID(archive)
2. give user a service-owned archive to [link](https://github.com/poga/hyperdrive-ln) to its ID.

`service` is an object with two key: `{publicKey, secretKey}`. You must use `sodium-signatures` to create a keyPair: `signatures.keyPair()`

returns a token string.

#### `id.acceptLinkToken(token, cb(err))`

User need to accept the token to verify him/herself. This will:

1. write a response to `proofs/${service.publicKey}`
2. link `archiveKey` at `links/${service.publicKey}

#### `id.verifyAcceptingness(service, cb(err, verified))`

Then, service find files in the archive written in the previous step, verify it, and the sign-up is complete.

## License

The MIT License
