# Hyperidentity

Store and Prove yourself with [hyperdrive](https://github.com/mafintosh/hyperdrive) archive.

## Synopsis

```js
var hyperidentity = require('hyperidentity')

var me = hyperidentity(drive)

// verify yourself to a service:
// service will give you a challenge for you to response
me.responseChallenge(serviceName, nonce, email, cb)

// save your metadata
me.setMeta(meta, cb)
me.getMeta(cb)

// services will store the data you created on their side in another archive
// link that archive to your identity
me.link(archiveName, key, cb)
```

## License

The MIT License
