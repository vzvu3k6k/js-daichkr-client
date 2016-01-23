import url from 'url';

export default class Antenna {
  constructor(client, id) {
    this.client = client;
    this.id = id;
  }

  fetchInfo() {
    return this.client.browser.visit(this.getPath())
      .then(() => {
        const find = (selector) => this.client.browser.document.querySelector(selector);
        const description = find('hgroup.article-header-group .description').textContent.trim();
        const title = find('h1.antenna-title').textContent.trim();
        let permission;
        let name;
        if (find('.status-permission > img[src="/images/ic_lock_24px.svg"]')) {
          permission = 'secret';
          name = title.replace(/ \(ひっそり\)$/, '');
        } else if (find('.status-contributors').textContent.trim() === 'プライベート編集モード') {
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
    return this.client.browser.visit(this.getPath() + '/edit')
      .then(() => {
        const find = (selector) => this.client.browser.document.querySelector(selector);
        const description = find('.antenna-edit-form input[name="description"]').value;
        const permission =
          find('.antenna-edit-form input[name="permission"][type="radio"][checked]').value;
        const title = find('.antenna-edit-description a').textContent.trim();
        const name = find('.antenna-edit-form input[name="name"]').value;
        const note = find('.antenna-edit-note-form textarea[name="note"]').value;
        return { description, permission, title, name, note };
      });
  }

  // /antenna/:id/edit requires all of `name`, `description` and `permission` to be provided.
  // Otherwise, you may get an unwanted result.
  //   - Without `name` or `description`, it will be set as empty.
  //   - Without `permission`, the antenna will be gone.
  updateInfo(info) {
    if (!this.client.loggedIn) return Promise.reject('You must login to access an edit page.');
    return this.client.browser.visit(this.getPath() + '/edit')
      .then(() => {
        for (const key of Object.keys(info)) {
          this.client.browser.fill(`.antenna-edit-form input[name="${key}"]`, info[key]);
        }
        return this.client.browser.pressButton('.antenna-edit-form-submit');
      });
  }

  updateNote(note) {
    if (!this.client.loggedIn) return Promise.reject('You must login to access an edit page.');
    return this.client.post(`${this.getPath()}/edit_note`, { note });
  }

  getPath() {
    if (!this.id) throw new Error('this.id is empty.');
    return `/antenna/${this.id}`;
  }

  delete() {
    return this.client.post(`${this.getPath()}/delete`);
  }

  subscribe(uri) {
    return this.client.post(`${this.getPath()}/subscribe`, { uri });
  }

  unsubscribe(uri) {
    return this.client.post(`${this.getPath()}/unsubscribe`, { uri });
  }

  static create(client, properties) {
    return client.post('/antenna/create', {
      name: properties.name,
      description: properties.description,
      permission: properties.permission,
    }).then((response) => {
      const path = url.parse(response.url).path;
      const match = path.match(/^\/antenna\/([^/]+)\//);
      if (!match) return Promise.reject(new Error('Cannot find antenna ID'));
      return new Antenna(client, match[1]);
    });
  }
}
