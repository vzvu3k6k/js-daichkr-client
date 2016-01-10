import Antenna from './antenna';
import Browser from 'zombie';
import packageInfo from '../package.json';
import querystring from 'querystring';

export default class DaichkrClient {
  constructor() {
    this.loggedIn = false;
    this.browser = new Browser();
    this.browser.site = 'https://daichkr.hatelabo.jp';
    this.browser.userAgent = `npm/${packageInfo.name}/${packageInfo.version}`;
    this.browser.runScripts = false;
  }

  loginWithHatenaId(username, password) {
    if (this.loggedIn) return Promise.resolve();
    return this.browser.visit('/login')
      .then(() => {
        return this.browser
          .fill('name', username)
          .fill('password', password)
          .fill('persistent', 0)
          .pressButton('次ステップ');
      })
      .then(() => {
        const message = this.browser.document.querySelector('.error-message');
        if (message) {
          return Promise.reject(new Error(`Cannot login: ${message.textContent.trim()}`));
        }

        // follow redirection by <meta>
        // based on getMetaRefreshURL in github.com/assaf/zombie/src/document.js
        const meta = this.browser.document.querySelector('meta[http-equiv="Refresh"]');
        if (meta && meta.content) {
          const match = meta.content.match(/^\s*(\d+)(?:\s*;\s*url\s*=\s*(.*?))?\s*(?:;|$)/i);
          if (match && parseInt(match[1], 10) >= 0) {
            return this.browser.visit(match[2]);
          }
        }
        return Promise.reject(new Error('Cannot login: Redirection is not found.'));
      })
      .then(() => {
        return this.browser.pressButton('許可する');
      })
      .then(() => {
        this.loggedIn = true;
      });
  }

  buildAntenna(properties) {
    return new Antenna(this, properties);
  }

  getAntenna(id) {
    return new Antenna(this, { id });
  }

  getCsrfToken() {
    if (!this.loggedIn) return Promise.reject(new Error('You must login to get a CSRF token.'));
    if (this.csrfToken) return this.csrfToken;
    return this.browser.visit('/')
      .then(() => {
        const csrf = this.browser.document.querySelector('form input[name="csrf"]');
        if (csrf && csrf.value) {
          return (this.csrfToken = Promise.resolve(csrf.value));
        }
        return Promise.reject(new Error('Cannot find a CSRF token'));
      });
  }

  post(path, query) {
    return this.getCsrfToken()
      .then((csrf) => {
        const body = querystring.stringify(Object.assign({ csrf }, query));
        const headers = new this.browser.constructor.Headers();
        headers.append('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
        return this.fetch(path, {
          method: 'POST',
          body,
          headers,
        });
      });
  }

  fetch(...args) {
    return this.browser.fetch(...args)
      .then((response) => {
        if (response.status === 200) return Promise.resolve(response);
        return Promise.reject(response);
      });
  }
}
