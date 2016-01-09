export default class Antenna {
  constructor(client, id) {
    this.client = client;
    this.id = id;
  }

  subscribe(uri) {
    return this.client.post(`/antenna/${this.id}/subscribe`, { uri });
  }

  unsubscribe(uri) {
    return this.client.post(`/antenna/${this.id}/unsubscribe`, { uri });
  }
}
