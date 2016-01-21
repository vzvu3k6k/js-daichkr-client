import url from 'url';

export default class Antenna {
  constructor(client, id) {
    this.client = client;
    this.id = id;
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
