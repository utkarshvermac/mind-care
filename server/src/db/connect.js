const mongoose = require("mongoose")
const config = require("../config")

let connected = false

async function connectDB() {
  if (connected) return mongoose.connection
  mongoose.set("strictQuery", true)
  await mongoose.connect(config.mongoUri)
  connected = true
  console.log("[db] Connected to MongoDB")
  return mongoose.connection
}

module.exports = { connectDB }
