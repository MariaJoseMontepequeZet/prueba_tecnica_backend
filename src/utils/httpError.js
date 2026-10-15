// Error con código HTTP, lo interpreta el middleware errorHandler
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

module.exports = HttpError;
