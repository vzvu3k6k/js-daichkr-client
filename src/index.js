import Antenna from './antenna';
import cssSelect from 'css-select';
import htmlparser from 'htmlparser2';
import htmlUtils from './html-utils';
import packageInfo from '../package.json';
import pify from 'pify';
import querystring from 'querystring';
import request from 'request';
import url from 'url';

export default class DaichkrClient {
  constructor() {
    const baseRequest = request.defaults({
      // required by loginWithHatenaId after submitting form[action="/oauth/authorize"]
      followAllRedirects: true,

      headers: { 'User-Agent': `npm/${packageInfo.name}/${packageInfo.version}` },
      jar: true,
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
    return this.agent.get(this.resolveUrl('/login'))
      .then(([response, body]) => {
        const doc = htmlparser.parseDOM(body);
        const form = cssSelect.selectOne('form[action="/login"]', doc);
        return this.submitForm(form, response.request.uri.href, { name, password, persistent: 0 });
      })
      .then(([response, body]) => {
        if (response.request.uri.href !== 'https://www.hatena.ne.jp/login') {
          return Promise.reject(new Error('Cannot login: Unknown URL'));
        }

        const doc = htmlparser.parseDOM(body);
        const redirection = cssSelect.selectOne('meta[http-equiv="Refresh"]', doc);
        if (redirection) {
          const nextUrl = redirection.attribs.content.match(/URL=(.+)/)[1];
          return this.agent.get(nextUrl);
        }

        const error = cssSelect.selectOne('.error-message', doc);
        let message = 'Cannot login';
        if (error) message += `: ${htmlUtils.getText(error).trim()}`;
        return Promise.reject(new Error(message));
      })
      .then(([response, body]) => {
        if (!response.request.uri.href.startsWith('https://www.hatena.ne.jp/oauth/authorize?')) {
          return Promise.reject(new Error('Cannot login: Unknown URL'));
        }
        const doc = htmlparser.parseDOM(body);
        const form = cssSelect.selectOne('form[action="/oauth/authorize"]', doc);
        return this.submitForm(form, response.request.uri.href);
      })
      .then(([response, body]) => {
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
    return this.agent.get(this.resolveUrl('/'))
      .then(([response, body]) => {
        const doc = htmlparser.parseDOM(body);
        const csrf = cssSelect.selectOne('form input[name="csrf"]', doc);
        if (csrf && csrf.attribs.value) {
          return (this.csrfToken = Promise.resolve(csrf.attribs.value));
        }
        return Promise.reject(new Error('Cannot find a CSRF token'));
      });
  }

  post(url, query) {
    return this.getCsrfToken()
      .then((csrf) => {
        const form = Object.assign({ csrf }, query);
        return this.agent.post(this.resolveUrl(url), { form });
      });
  }

  submitForm(form, baseUrl, data = {}) {
    const inputs = cssSelect('input[name][value]', form);
    const baseData = {};
    for (const input of inputs) baseData[input.attribs.name] = input.attribs.value;
    return this.agent.post(
      url.resolve(baseUrl, form.attribs.action),
      { form: Object.assign(baseData, data) }
    );
  }
}
