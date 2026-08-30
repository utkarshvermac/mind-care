const db = require("../db")
const { verifyToken } = require("../utils/jwt")
const { ApiError } = require("../utils/ApiError")

/** Verifies the bearer token and attaches the full user row to req.user. */
function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || ""
    const [scheme, token] = header.split(" ")
    if (scheme !== "Bearer" || !token) {
      throw new ApiError(401, "Missing or malformed Authorization header")
    }

    const payload = verifyToken(token)
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(payload.sub)
    if (!user) throw new ApiError(401, "User no longer exists")

    req.user = user
    next()
  } catch (err) {
    if (err instanceof ApiError) return next(err)
    next(new ApiError(401, "Invalid or expired token"))
  }
}

/** Use after requireAuth to restrict a route to one or more roles. */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, `This action requires role: ${roles.join(" or ")}`))
    }
    next()
  }
}

module.exports = { requireAuth, requireRole }
