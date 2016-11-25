/* eslint-env mocha */
import ToughCookieFilestore from 'tough-cookie-filestore';
import assert from 'assert';
import path from 'path';
import pify from 'pify';
import request from 'request';
import Antenna from '../src/antenna';
import DaichkrClient from '../src/';
import hatenaId from './secrets/hatenaId.json';

function shouldFail(promise) {
  return promise.then(() => Promise.reject('Should fail'), () => Promise.resolve());
}

const loggedInClient = new DaichkrClient({
  jar: new ToughCookieFilestore(path.resolve(__dirname, './secrets/logined.jar')),
});

describe('DaichkrClient', () => {
  describe('#loginWithHatenaId', () => {
    it('should success with correct ID', () => {
      const client = new DaichkrClient();
      return client.loginWithHatenaId(hatenaId.username, hatenaId.password);
    });

    it('should fail with wrong ID', () => {
      const client = new DaichkrClient();
      return shouldFail(client.loginWithHatenaId('!', '!'));
    });
  });

  describe('#getCsrfToken', () => {
    it('should success if already logged in', () => loggedInClient.getCsrfToken());
  });
});

describe('Antenna', () => {
  let tempAntenna;

  describe('#create', () => {
    it('should success', () => Antenna.create(loggedInClient, {
      name: 'js-daichkr-client test',
      description: 'test',
      permission: 'secret',
    }).then((createdAntenna) => {
      tempAntenna = createdAntenna;
    }));
  });

  describe('#fetchInfo', () => {
    it('should parse a public antenna', () => {
      const antenna = new Antenna(new DaichkrClient(), '960669575395951115');
      return antenna.fetchInfo()
        .then(info => assert.deepEqual(info, {
          title: '大チェッカーチェッカー',
          name: '大チェッカーチェッカー',
          description: '大チェッカー情報を集めてチェック',
          permission: 'public',
        }));
    });

    it('should parse a locked antenna', () => {
      const antenna = new Antenna(new DaichkrClient(), '960640536987828250');
      return antenna.fetchInfo()
        .then(info => assert.deepEqual(info, {
          title: 'hitode909の公式アンテナ',
          name: '公式アンテナ',
          description: 'hitode909の新着情報をまとめてチェックできます',
          permission: 'locked',
        }));
    });

    it('should parse a secret antenna', () => {
      const antenna = new Antenna(new DaichkrClient(), '960973446850557485');
      return antenna.fetchInfo()
        .then(info => assert.deepEqual(info, {
          title: 'どんどんチェック (ひっそり)',
          name: 'どんどんチェック',
          description: 'js-daichkr-clientのテスト用',
          permission: 'secret',
        }));
    });
  });

  describe('#fetchEditInfo', () => {
    it('should parse an edit page of my antenna', () =>
       tempAntenna.fetchEditInfo()
       .then(info => assert.deepEqual(info, {
         title: 'js-daichkr-client test (ひっそり)',
         name: 'js-daichkr-client test',
         description: 'test',
         permission: 'secret',
         isMine: true,
         note: '',
       })),
      );

    it('should parse an edit page of an antenna which is not mine', () => {
      const antenna = new Antenna(loggedInClient, '960973446850557485');
      return antenna.fetchEditInfo()
        .then(info => assert.deepEqual(info, {
          title: 'どんどんチェック (ひっそり)',
          name: 'どんどんチェック',
          description: 'js-daichkr-clientのテスト用',
          permission: 'secret',
          isMine: false,
          note: '大チェッカーで、しゅっとインターネットをチェックしてみませんか。',
        }));
    });
  });

  describe('#updateInfo', () => {
    // Permission is not changed to avoid pollution of 最近のアンテナ in the top page.
    it('should success', () => tempAntenna.updateInfo({
      name: 'js-daichkr-client [updated]',
      description: '[updated]',
    }).then(() => tempAntenna.fetchInfo())
       .then((info) => {
         assert.equal(info.name, 'js-daichkr-client [updated]');
         assert.equal(info.description, '[updated]');
       }));
  });

  describe('#updateNote', () => {
    it('should success', () => tempAntenna.updateNote('みんなで作ろう大チェッカー')
       .then(() => tempAntenna.fetchEditInfo())
       .then((info) => {
         assert.equal(info.note, 'みんなで作ろう大チェッカー');
       }));
  });

  const get = pify(request.get, { multiArgs: true });
  const feedUrl = 'http://developer.hatenastaff.com/feed';

  describe('#subscribe', () => {
    it('should success', () => tempAntenna.subscribe(feedUrl)
       .then(() => get(`${tempAntenna.getUrl()}/opml`))
       .then((args) => {
         const body = args[1];
         assert(body.includes(feedUrl));
       }));
  });

  describe('#unsubscribe', () => {
    it('should success', () => tempAntenna.unsubscribe(feedUrl)
       .then(() => get(`${tempAntenna.getUrl()}/opml`))
       .then((args) => {
         const body = args[1];
         assert(!body.includes(feedUrl));
       }));
  });

  describe('#delete', () => {
    it('should success', () => tempAntenna.delete());
  });
});
