require("dotenv").config()

const config = {
  port: process.env.PORT || 4000,
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "30d",
  corsOrigin: process.env.CORS_ORIGIN || "*",
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/mindcare",
}

if (process.env.NODE_ENV === "production" && config.jwtSecret === "dev-secret-change-me") {
  console.warn("[config] WARNING: JWT_SECRET is not set. Set a real secret before deploying to production.")
}

module.exports = config
