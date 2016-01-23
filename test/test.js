/* eslint-env mocha */
/* eslint func-names:0 */
import DaichkrClient from '../src/';
import secret from './secret.json';

function shouldFail(promise) {
  return promise.then(() => Promise.reject('Should fail'), () => Promise.resolve());
}

describe('DaichkrClient', function () {
  this.timeout(10000);
  let loggedInClient;

  describe('#loginWithHatenaId', function () {
    it('should success with correct ID', function () {
      loggedInClient = new DaichkrClient();
      return loggedInClient.loginWithHatenaId(secret.hatenaId.username, secret.hatenaId.password);
    });

    it('should fail with wrong ID', function () {
      const client = new DaichkrClient();
      return shouldFail(client.loginWithHatenaId('!', '!'));
    });
  });

  describe('#getCsrfToken', function () {
    it('should success if already logged in', function () {
      return loggedInClient.getCsrfToken();
    });
  });
});
