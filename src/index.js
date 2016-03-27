import Antenna from './antenna';
import cheerio from 'cheerio';
import formToRequest from './form-to-request';
import packageInfo from '../package.json';
import parseMetaRefresh from 'http-equiv-refresh';
import pify from 'pify';
import request from 'request';
import url from 'url';

export default class DaichkrClient {
  constructor() {
    const baseRequest = request.defaults({
      // required by loginWithHatenaId after submitting form[action="/oauth/authorize"]
      followAllRedirects: true,

      headers: { 'User-Agent': `npm/${packageInfo.name}/${packageInfo.version}` },
      jar: request.jar(),
    });
    this.agent = pify(baseRequest, { multiArgs: true });
    this.baseUrl = 'https://daichkr.hatelabo.jp/';
    this.loggedIn = false;
  }

  resolveUrl(to) {
    return url.resolve(this.baseUrl, to);
  }

  loginWithHatenaId(name, password) {
    if (this.loggedIn) return Promise.resolve();
    return this.get(this.resolveUrl('/login'))
      .then(([response, $]) => {
        const form = $('form[action="/login"]');
        const req = formToRequest(
          form, response.request.uri.href,
          { name, password, persistent: 0 }
        );
        return this.send(req);
      })
      .then(([response, $]) => {
        if (response.request.uri.href === 'https://www.hatena.ne.jp/login') {
          const error = $('.error-message');
          let message = 'Cannot login';
          if (error.length) message += `: ${error.text().trim()}`;
          return Promise.reject(new Error(message));
        }

        if (!response.request.uri.href.startsWith('https://www.hatena.ne.jp/oauth/authorize?')) {
          return Promise.reject(new Error('Cannot login: Unknown URL'));
        }
        const form = $('form[action="/oauth/authorize"]');
        const req = formToRequest(form, response.request.uri.href);
        return this.send(req);
      })
      .then(() => {
        this.loggedIn = true;
      });
  }

  createAntenna(properties) {
    return Antenna.create(this, properties);
  }

  getAntenna(id) {
    return new Antenna(this, id);
  }

  getCsrfToken() {
    if (!this.loggedIn) return Promise.reject(new Error('You must login to get a CSRF token.'));
    if (this.csrfToken) return this.csrfToken;
    return this.get(this.resolveUrl('/'))
      .then(([, $]) => {
        const csrf = $('form input[name="csrf"]');
        if (csrf.attr('value')) {
          return (this.csrfToken = Promise.resolve(csrf.attr('value')));
        }
        return Promise.reject(new Error('Cannot find a CSRF token'));
      });
  }

  send(req) {
    return this.agent(req)
      .then(([response, body]) => {
        const type = response.headers['content-type'];
        if (type && /^text\/html(;|$)/.test(type)) {
          return [response, cheerio.load(body)];
        }
        return [response, body];
      })
      .then(([response, $]) => {
        if (typeof $ !== 'function') return [response, $];

        const redirection = $('meta[http-equiv="Refresh"][content]');
        if (redirection.length) {
          const content = redirection.attr('content');
          if (content) {
            const refresh = parseMetaRefresh(content);
            if (refresh.timeout < 0) {
              return [response, $];
            }
            return this.get(refresh.url || response.request.uri.href);
          }
        }
        return [response, $];
      });
  }

  get(targetUrl) {
    return this.send({ url: targetUrl, method: 'GET' });
  }

  post(targetUrl, query) {
    return this.getCsrfToken()
      .then((csrf) => {
        const form = Object.assign({ csrf }, query);
        return this.send({ url: this.resolveUrl(targetUrl), method: 'POST', form });
      });
  }
}
