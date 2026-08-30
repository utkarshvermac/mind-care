const express = require("express")
const cors = require("cors")
const helmet = require("helmet")
const rateLimit = require("express-rate-limit")
const morgan = require("morgan")
const config = require("./config")
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler")

const authRoutes = require("./routes/auth.routes")
const usersRoutes = require("./routes/users.routes")
const patientsRoutes = require("./routes/patients.routes")
const caregiversRoutes = require("./routes/caregivers.routes")
const gamesRoutes = require("./routes/games.routes")
const gameResultsRoutes = require("./routes/gameResults.routes")
const analyticsRoutes = require("./routes/analytics.routes")
const wellnessRoutes = require("./routes/wellness.routes")
const remindersRoutes = require("./routes/reminders.routes")
const achievementsRoutes = require("./routes/achievements.routes")
const assistantRoutes = require("./routes/assistant.routes")

const app = express()

app.use(helmet())
app.use(cors({ origin: config.corsOrigin === "*" ? true : config.corsOrigin.split(",") }))
app.use(express.json())
if (process.env.NODE_ENV !== "test") app.use(morgan("dev"))

// General API rate limit — generous, just guards against runaway loops/abuse.
app.use(
  "/api",
  rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false }),
)

// Tighter limit specifically on auth endpoints to slow down credential guessing.
app.use(
  "/api/auth",
  rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false }),
)

app.get("/api/health", (req, res) => res.json({ ok: true, time: new Date().toISOString() }))

app.use("/api/auth", authRoutes)
app.use("/api/users", usersRoutes)
app.use("/api/patients", patientsRoutes)
app.use("/api/caregivers", caregiversRoutes)
app.use("/api/games", gamesRoutes)
app.use("/api/game-results", gameResultsRoutes)
app.use("/api/analytics", analyticsRoutes)
app.use("/api/wellness", wellnessRoutes)
app.use("/api/reminders", remindersRoutes)
app.use("/api/achievements", achievementsRoutes)
app.use("/api/assistant", assistantRoutes)

app.use(notFoundHandler)
app.use(errorHandler)

module.exports = app
