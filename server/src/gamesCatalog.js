// Static reference data for the three cognitive games. This mirrors
// `lib/mock-data.ts` (games, gameNames, wordBank, cardSymbols) from the
// frontend so the backend can be the single source of truth for it.

const GAME_IDS = ["card-match", "pattern-recall", "word-recall"]

const wordBank = [
  "APPLE",
  "RIVER",
  "BOOK",
  "FLOWER",
  "CHAIR",
  "TRAIN",
  "GARDEN",
  "CANDLE",
  "MARKET",
  "BRIDGE",
  "LETTER",
  "WINDOW",
  "MIRROR",
  "PENCIL",
  "BASKET",
  "SILVER",
]

const cardSymbols = ["Sun", "Moon", "Leaf", "Heart", "Star", "Bell"]

const games = [
  {
    id: "card-match",
    name: "Card Match",
    tagline: "Find the matching pairs",
    description: "A short memory exercise designed to keep your mind active.",
    difficulty: "Easy",
    minutes: 5,
    accent: "primary",
    skill: "Visual memory",
    config: { symbols: cardSymbols },
  },
  {
    id: "pattern-recall",
    name: "Pattern Recall",
    tagline: "Remember the lit squares",
    description: "Watch a pattern light up, then tap the same squares back.",
    difficulty: "Medium",
    minutes: 4,
    accent: "secondary",
    skill: "Working memory",
    config: { gridSize: 3 },
  },
  {
    id: "word-recall",
    name: "Word Recall",
    tagline: "Remember the word list",
    description: "Read a few words, then pick out the ones you saw.",
    difficulty: "Easy",
    minutes: 3,
    accent: "accent",
    skill: "Verbal memory",
    config: { wordBank },
  },
]

const gameNames = Object.fromEntries(games.map((g) => [g.id, g.name]))

function isValidGameId(id) {
  return GAME_IDS.includes(id)
}

module.exports = { GAME_IDS, games, gameNames, wordBank, cardSymbols, isValidGameId }
