/* eslint-env mocha */
/* eslint func-names:0 */
import Antenna from '../src/antenna';
import DaichkrClient from '../src/';
import assert from 'assert';
import pify from 'pify';
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
  describe('#fetchInfo', function () {
    it('should parse a public antenna', function () {
      const antenna = new Antenna(new DaichkrClient(), '960669575395951115');
      return antenna.fetchInfo()
        .then((info) => assert.deepEqual(info, {
          title: '大チェッカーチェッカー',
          name: '大チェッカーチェッカー',
          description: '大チェッカー情報を集めてチェック',
          permission: 'public',
        }));
    });

    it('should parse a locked antenna', function () {
      const antenna = new Antenna(new DaichkrClient(), '960640536987828250');
      return antenna.fetchInfo()
        .then((info) => assert.deepEqual(info, {
          title: 'hitode909の公式アンテナ',
          name: '公式アンテナ',
          description: 'hitode909の新着情報をまとめてチェックできます',
          permission: 'locked',
        }));
    });

    it('should parse a secret antenna', function () {
      const antenna = new Antenna(new DaichkrClient(), '960973446850557485');
      return antenna.fetchInfo()
        .then((info) => assert.deepEqual(info, {
          title: 'どんどんチェック (ひっそり)',
          name: 'どんどんチェック',
          description: 'js-daichkr-clientのテスト用',
          permission: 'secret',
        }));
    });
  });

  describe('#fetchEditInfo', function () {
    it('should parse an edit page of an antenna', function () {
      const antenna = new Antenna(loggedInClient, '960973446850557485');
      return antenna.fetchEditInfo()
        .then((info) => assert.deepEqual(info, {
          title: 'どんどんチェック (ひっそり)',
          name: 'どんどんチェック',
          description: 'js-daichkr-clientのテスト用',
          permission: 'secret',
          note: '大チェッカーで、しゅっとインターネットをチェックしてみませんか。',
        }));
    });
  });

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

  describe('#updateInfo', function () {
    it('should success', function () {
      // Permission is not changed to avoid pollution of 最近のアンテナ in the top page.
      return tempAntenna.updateInfo({
        name: 'js-daichkr-client [updated]',
        description: '[updated]',
      }).then(() => {
        return tempAntenna.fetchInfo();
      }).then((info) => {
        assert.equal(info.name, 'js-daichkr-client [updated]');
        assert.equal(info.description, '[updated]');
      });
    });
  });

  describe('#updateNote', function () {
    it('should success', function () {
      return tempAntenna.updateNote('みんなで作ろう大チェッカー')
        .then(() => {
          return tempAntenna.fetchEditInfo();
        })
        .then((info) => {
          assert.equal(info.note, 'みんなで作ろう大チェッカー');
        });
    });
  });

  const get = pify(request.get, { multiArgs: true });
  const feedUrl = 'http://developer.hatenastaff.com/feed';

  describe('#subscribe', function () {
    it('should success', function () {
      return tempAntenna.subscribe(feedUrl)
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
      return tempAntenna.unsubscribe(feedUrl)
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
