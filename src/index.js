import assert from 'assert';
import cheerio from 'cheerio';
import parseMetaRefresh from 'http-equiv-refresh';
import pify from 'pify';
import request from 'request';
import url from 'url';
import Antenna from './antenna';
import HTTPError from './http-error';
import formToRequest from './form-to-request';
import packageInfo from '../package.json';

export default class DaichkrClient {
  constructor(options = {}) {
    const baseRequest = request.defaults({
      // required by loginWithHatenaId after submitting form[action="/oauth/authorize"]
      followAllRedirects: true,

      headers: { 'User-Agent': `npm/${packageInfo.name}/${packageInfo.version}` },
      jar: request.jar(options.jar),
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
        assert(response.request.uri.protocol, 'https:');
        assert(response.request.uri.host, 'www.hatena.ne.jp');

        const error = $('.error-message');
        if (error.length) {
          let message = 'Cannot login';
          if (error.length) message += `: ${error.text().trim()}`;
          return Promise.reject(new Error(message));
        }

        if (!response.request.uri.path === '/oauth/authorize') {
          return Promise.reject(new Error(`Cannot login: Unknown URL (${response.request.uri.href})`));
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
    if (this.csrfToken) return this.csrfToken;
    return this.get(this.resolveUrl('/'))
      .then(([, $]) => {
        const csrf = $('form input[name="csrf"]');
        if (csrf.attr('value')) {
          this.csrfToken = Promise.resolve(csrf.attr('value'));
          return this.csrfToken;
        }
        return Promise.reject(new Error('Cannot find a CSRF token'));
      });
  }

  send(req) {
    return this.agent(req)
      .then(([response, body]) => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          return Promise.reject(new HTTPError(response));
        }

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
        const form = { csrf, ...query };
        return this.send({ url: this.resolveUrl(targetUrl), method: 'POST', form });
      });
  }
}

DaichkrClient.HTTPError = HTTPError;
