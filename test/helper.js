module.exports = {mockService}

function mockService (keyPair, name) {
  return {keyPair: keyPair, meta: {name: name}}
}
