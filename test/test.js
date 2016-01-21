/* eslint-env mocha */
/* eslint func-names:0 */
import Antenna from '../src/antenna';
import DaichkrClient from '../src/';
import assert from 'assert';
import bluebird from 'bluebird';
import request from 'request';
import secret from './secret.json';

function shouldFail(promise) {
  return promise.then(() => Promise.reject('Should fail'), () => Promise.resolve());
}

let loggedInClient;

describe('DaichkrClient', function () {
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

describe('Antenna', function () {
  let tempAntenna;

  describe('#create', function () {
    it('should success', function () {
      return Antenna.create(loggedInClient, {
        name: 'js-daichkr-client test',
        description: 'test',
        permission: 'secret',
      }).then((createdAntenna) => tempAntenna = createdAntenna);
    });
  });

  const get = bluebird.promisify(request.get, { multiArgs: true });
  const feedUrl = 'http://developer.hatenastaff.com/feed';

  describe('#subscribe', function () {
    it('should success', function () {
      tempAntenna.subscribe(feedUrl)
        .then(() => {
          return get(tempAntenna.getPath() + '/opml')
            .then((response, body) => {
              assert(body.includes(feedUrl));
            });
        });
    });
  });

  describe('#unsubscribe', function () {
    it('should success', function () {
      tempAntenna.unsubscribe(feedUrl)
        .then(() => {
          return get(tempAntenna.getPath() + '/opml')
            .then((response, body) => {
              assert(!body.includes(feedUrl));
            });
        });
    });
  });

  describe('#delete', function () {
    it('should success', function () {
      return tempAntenna.delete();
    });
  });
});
