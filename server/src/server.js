const app = require("./app")
const config = require("./config")
const { connectDB } = require("./db/connect")

async function start() {
  await connectDB()
  app.listen(config.port, () => {
    console.log(`MindCare backend listening on http://localhost:${config.port}`)
  })
}

start().catch((err) => {
  console.error("[server] Failed to start:", err)
  process.exit(1)
})
