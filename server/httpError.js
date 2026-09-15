'use strict';

/** Thrown by any server/*.js module to signal a specific HTTP status —
    caught once in server.js's route dispatch rather than each route
    handling its own error responses. */
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

module.exports = { HttpError };
