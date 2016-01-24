This is a client for https://daichkr.hatelabo.jp/ for node.js.

# Installation

```
npm install -S @vzvu3k6k/daichkr-client
```

# Example

```js
var DaichkrClient = require('@vzvu3k6k/daichkr-client');

var client = new DaichkrClient();
client.loginWithHatenaId(id, password).
  then(() => {
    return client.createAntenna({
      name:        '大アンテナ',
      description: '大アンテナです',
      permission:  'secret', // public, locked, secret
    });
  }).
  then((antenna) => {
    antenna.subscribe('http://example.com/atom.xml');
  });
```

# Test

daichkr.hatelabo.jp is in beta without public APIs, so there are tests to ensure it behaves as expected. You can run them by `npm test`.

Some tests need a Hatena ID. Set your username and password to test/secret.json as below: 

```json
{
  "hatenaId": {
    "username": "...", 
    "password": "..."
  }
}
```
