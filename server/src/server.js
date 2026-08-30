const app = require("./app")
const config = require("./config")

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`MindCare backend listening on http://localhost:${config.port}`)
})
