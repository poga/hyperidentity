# hyperidentity

![stability-experimental](https://img.shields.io/badge/stability-experimental-orange.svg?style=flat-square)
[![NPM Version](https://img.shields.io/npm/v/hyperidentity.svg)](https://www.npmjs.com/package/hyperidentity)
[![JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)

A decentralized authentication and data-sharing protocol. Hyperidentity allows you to

* **Own your data**:  Provide your data to a web services but still controll what you've shared.
* **Avoid vendor lock-in**: Move your data between services.
* **No single-point-of-failure**: Every service can have a up-to-date copy of your data. There won't be a single service depended by all other services. Think github and all other Code Review/Deploy/Project Management tools.

`npm i -g hyperidentity`

## Usage

Create an identity:

```
$ hi init path_to_my_new_identity
56d0a72488190d37aaa28447a5600eafe67df00bf89ab646def449c17e331a56 // your identity key
```

Login to a service:

```
$ hi login path_to_my_identity token
```

## API

### Sign up flow

```js
const hyperdrive = require('hyperdrive')
const memdb = require('memdb')
const hyperidentity = require('hyperidentity')
const signatures = require('sodium-signatures')

// create a new hyperdrive
var drive = hyperdrive(memdb())

// create a new user on hyperdrive
var ID = hyperidentity(archive)
// create a new service. a service is an ed25519 key pair
var service = signatures.keyPair()

// now user want to signup to the service:

// 1. user provide its ID's public key to service
//    so service can create the same ID object with hyperidentity(drive, key)
// 2. service create a new archive to store user's data
// 3. service create a link request token for the user, send to user
var linkToken = ID.serviceLinkToken(service, '<SERVICE_ARCHIVE_KEY>')

// 4. user received the token, pass it to its ID,
//    ID should verify the token and write a response to its archive
ID.acceptLinkToken(linkToken, err => {

  // 5. service watch the archive list, find the proof, verify it
  ID.verifyAcceptingness(service, (err, verified) => {
    // if everything ok, verified === true

    // 6. and it's done!
  })
})
```

#### `id = hyperidentity(archive)`

Create a new identity with a [hyperdrive](https://github.com/mafintosh/hyperdrive) archive.

#### `id.archive`

The archive used by this ID.

#### `id.setMeta(meta, cb)`

Set metadata of the ID

#### `id.getMeta(cb)`

Get metadata of the ID

### Signup Flow

#### `token = id.serviceLinkToken(service, archiveKey)`

Create a link token for `id` for the following purpose:

1. verify user really own the ID(archive)
2. give user a service-owned archive to [link](https://github.com/poga/hyperdrive-ln) to its ID.

`service` is an object with two key: `{publicKey, secretKey}`. You need to use `sodium-signatures` to create a keyPair: `signatures.keyPair()`

Returns a token string.

#### `id.acceptLinkToken(token, cb(err))`

Accept a link token. Under the hood, this will:

1. write a response to `.proofs/${service.publicKey}`
2. link `archiveKey` at `.links/${service.publicKey}

#### `id.verifyAcceptingness(service, cb(err, verified))`

Check whether `id` accepted the link token from `service`.

## License

The MIT License
