const { ApiError } = require("../utils/ApiError")

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: { message: err.message, details: err.details ?? null } })
  }

  // eslint-disable-next-line no-console
  console.error(err)
  res.status(500).json({ error: { message: "Something went wrong on our end." } })
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: { message: `No route for ${req.method} ${req.originalUrl}` } })
}

module.exports = { errorHandler, notFoundHandler }
