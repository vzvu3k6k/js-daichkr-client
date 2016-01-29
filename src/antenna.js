import cssSelect from 'css-select';
import htmlparser from 'htmlparser2';
import htmlUtils from './html-utils';

export default class Antenna {
  constructor(client, id) {
    this.client = client;
    this.id = id;
  }

  fetchInfo() {
    return this.client.agent.get(this.getUrl())
      .then(([, body]) => {
        const doc = htmlparser.parseDOM(body);
        const description = htmlUtils.getText(
          cssSelect.selectOne('hgroup.article-header-group .description', doc)).trim();
        const title = htmlUtils.getText(cssSelect.selectOne('h1.antenna-title', doc)).trim();
        let permission;
        let name;
        if (cssSelect.selectOne('.status-permission > img[src="/images/ic_lock_24px.svg"]', doc)) {
          permission = 'secret';
          name = title.replace(/ \(ひっそり\)$/, '');
        } else if (htmlUtils.getText(
          cssSelect.selectOne('.status-contributors', doc)).trim() === 'プライベート編集モード') {
          permission = 'locked';
          name = title.replace(/^[^の]+の/, '');
        } else {
          permission = 'public';
          name = title;
        }
        return { description, permission, title, name };
      });
  }

  fetchEditInfo() {
    if (!this.client.loggedIn) return Promise.reject('You must login to access an edit page.');
    return this.client.agent.get(`${this.getUrl()}/edit`)
      .then(([, body]) => {
        const doc = htmlparser.parseDOM(body);
        const description = cssSelect.selectOne(
          '.antenna-edit-form input[name="description"]', doc).attribs.value;
        const permission = cssSelect.selectOne(
          '.antenna-edit-form input[name="permission"][type="radio"][checked]', doc
        ).attribs.value;
        const title = htmlUtils.getText(
          cssSelect.selectOne('.antenna-edit-description a', doc)).trim();
        const name = cssSelect.selectOne(
          '.antenna-edit-form input[name="name"]', doc).attribs.value;
        const note = htmlUtils.getText(
          cssSelect.selectOne('.antenna-edit-note-form textarea[name="note"]', doc));
        return { description, permission, title, name, note };
      });
  }

  // /antenna/:id/edit requires all of `name`, `description` and `permission` to be provided.
  // Otherwise, you may get an unwanted result.
  //   - Without `name` or `description`, it will be set as empty.
  //   - Without `permission`, the antenna will be gone.
  updateInfo(info) {
    if (!this.client.loggedIn) return Promise.reject('You must login to access an edit page.');
    return this.client.agent.get(`${this.getUrl()}/edit`)
      .then(([response, body]) => {
        const doc = htmlparser.parseDOM(body);
        const form = cssSelect.selectOne('.antenna-edit-form', doc);
        return this.client.submitForm(form, response.request.uri.href, info);
      });
  }

  updateNote(note) {
    if (!this.client.loggedIn) return Promise.reject('You must login to access an edit page.');
    return this.client.post(`${this.getUrl()}/edit_note`, { note });
  }

  getUrl() {
    if (!this.id) throw new Error('this.id is empty.');
    return this.client.resolveUrl(`/antenna/${this.id}`);
  }

  delete() {
    return this.client.post(`${this.getUrl()}/delete`);
  }

  subscribe(uri) {
    return this.client.post(`${this.getUrl()}/subscribe`, { uri });
  }

  unsubscribe(uri) {
    return this.client.post(`${this.getUrl()}/unsubscribe`, { uri });
  }

  static create(client, properties) {
    return client.post('/antenna/create', {
      name: properties.name,
      description: properties.description,
      permission: properties.permission,
    }).then(([response]) => {
      const path = response.request.uri.path;
      const match = path.match(/^\/antenna\/([^/]+)\//);
      if (!match) return Promise.reject(new Error('Cannot find antenna ID'));
      return new Antenna(client, match[1]);
    });
  }
}
