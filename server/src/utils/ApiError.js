class ApiError extends Error {
  constructor(status, message, details) {
    super(message)
    this.status = status
    this.details = details
  }
}

function assert(condition, status, message, details) {
  if (!condition) throw new ApiError(status, message, details)
}

module.exports = { ApiError, assert }
