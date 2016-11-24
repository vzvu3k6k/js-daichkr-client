export default class HTTPError extends Error {
  constructor(response, message = response.body) {
    super(message);
    this.response = response;
    this.statusCode = response.statusCode;
    this.body = response.body;
  }
}
