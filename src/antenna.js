import url from 'url';

export default class Antenna {
  constructor(client, properties) {
    this.client = client;
    for (let prop of ['id', 'name', 'description', 'permission', 'note']) {
      this[prop] = properties[prop];
    }
  }

  getPath() {
    if (!this.id) throw new Error('this.id is empty.');
    return `/antenna/${this.id}`;
  }

  create() {
    return this.client.post('/antenna/create', {
      name: this.name,
      description: this.description,
      permission: this.permission,
    }).then((response) => {
      let path = url.parse(response.url).path;
      let m = path.match(/^\/antenna\/([^/]+)\//);
      if (!m) {
        return Promise.reject('Cannot find antenna ID');
      }
      this.id = m[1];
      return response;
    });
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
}
