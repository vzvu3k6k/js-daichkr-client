import formToRequest from './form-to-request';

export default class Antenna {
  constructor(client, id) {
    this.client = client;
    this.id = id;
  }

  fetchInfo() {
    return this.client.get(this.getUrl())
      .then(([, $]) => {
        const description = $('hgroup.article-header-group .description').text().trim();
        const title = $('h1.antenna-title').text().trim();
        let permission;
        let name;
        if ($('.status-permission > img[src="/images/ic_lock_24px.svg"]').length) {
          permission = 'secret';
          name = title.replace(/ \(ひっそり\)$/, '');
        } else if ($('.status-contributors').text().trim() === 'プライベート編集モード') {
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
    return this.client.get(`${this.getUrl()}/edit`)
      .then(([, $]) => {
        const description = $('.antenna-edit-form input[name="description"]').attr('value');
        const permission = $(
          '.antenna-edit-form input[name="permission"][type="radio"][checked]'
        ).attr('value');
        const title = $('.antenna-edit-description a').text().trim();
        const name = $('.antenna-edit-form input[name="name"]').attr('value');
        const note = $('.antenna-edit-note-form textarea[name="note"]').text();
        return { description, permission, title, name, note };
      });
  }

  // /antenna/:id/edit requires all of `name`, `description` and `permission` to be provided.
  // Otherwise, you may get an unwanted result.
  //   - Without `name` or `description`, it will be set as empty.
  //   - Without `permission`, the antenna will be gone.
  updateInfo(info) {
    return this.client.get(`${this.getUrl()}/edit`)
      .then(([response, $]) => {
        const form = $('.antenna-edit-form');
        const request = formToRequest(form, response.request.uri.href, info);
        return this.client.agent(request);
      });
  }

  updateNote(note) {
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
