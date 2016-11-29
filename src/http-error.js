export default class HTTPError extends Error {
  constructor(response) {
    super(`${response.statusCode}: ${response.message}`);
    this.response = response;
    this.statusCode = response.statusCode;
    this.body = response.body;
  }
}
