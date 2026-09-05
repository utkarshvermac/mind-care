const express = require("express")
const { ApiError } = require("../utils/ApiError")
const { games } = require("../data/gamesCatalog")

const router = express.Router()

// GET /api/games — public reference data, no auth required
router.get("/", (req, res) => {
  res.json({ games })
})

// GET /api/games/:id
router.get("/:id", (req, res, next) => {
  const game = games.find((g) => g.id === req.params.id)
  if (!game) return next(new ApiError(404, `Unknown game id: ${req.params.id}`))
  res.json({ game })
})

module.exports = router
