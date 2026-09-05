require("dotenv").config()
const path = require("path")

const config = {
  port: Number(process.env.PORT) || 4000,
  jwtSecret: process.env.JWT_SECRET || "dev-only-insecure-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  dbPath: process.env.DB_PATH
    ? path.resolve(process.cwd(), process.env.DB_PATH)
    : path.resolve(__dirname, "..", "data", "mindcare.sqlite3"),
  corsOrigin: process.env.CORS_ORIGIN || "*",
}

if (config.jwtSecret === "dev-only-insecure-secret-change-me" && process.env.NODE_ENV === "production") {
  // eslint-disable-next-line no-console
  console.warn("[mindcare-backend] WARNING: using the default JWT_SECRET in production. Set JWT_SECRET in .env.")
}

module.exports = config
