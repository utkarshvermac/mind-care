// A small curated set of riddles and proverbs for the "Culture Corner" card.
// English-only for now, consistent with the rest of the game content (see
// the note in lib/i18n.tsx) — the structure is intentionally simple so more
// entries, or per-language variants, can be added later without touching
// any component code.
export type FolkloreEntry = {
  id: string
  type: "riddle" | "proverb"
  prompt: string
  answer: string
  origin?: string
}

export const folkloreEntries: FolkloreEntry[] = [
  {
    id: "f1",
    type: "riddle",
    prompt: "What has hands but cannot clap?",
    answer: "A clock.",
  },
  {
    id: "f2",
    type: "riddle",
    prompt: "The more you take, the more you leave behind. What am I?",
    answer: "Footsteps.",
  },
  {
    id: "f3",
    type: "proverb",
    prompt: "\"A house without books is like a room without windows.\"",
    answer: "A reminder that reading keeps the mind open to the wider world.",
    origin: "Traditional saying",
  },
  {
    id: "f4",
    type: "riddle",
    prompt: "I have cities, but no houses. I have mountains, but no trees. What am I?",
    answer: "A map.",
  },
  {
    id: "f5",
    type: "proverb",
    prompt: "\"Slow and steady wins the race.\"",
    answer: "Patience and consistency often beat rushing.",
    origin: "Aesop's fables",
  },
  {
    id: "f6",
    type: "riddle",
    prompt: "What can travel around the world while staying in a corner?",
    answer: "A stamp.",
  },
  {
    id: "f7",
    type: "proverb",
    prompt: "\"Many hands make light work.\"",
    answer: "A task shared with others feels lighter than one carried alone.",
    origin: "Traditional saying",
  },
  {
    id: "f8",
    type: "riddle",
    prompt: "What has a face and two hands but no arms or legs?",
    answer: "A clock.",
  },
  {
    id: "f9",
    type: "proverb",
    prompt: "\"Where there is unity, there is always victory.\"",
    answer: "A saying celebrating families and communities who look out for one another.",
    origin: "Traditional saying",
  },
  {
    id: "f10",
    type: "riddle",
    prompt: "What gets wetter the more it dries?",
    answer: "A towel.",
  },
]

/** Deterministic "entry of the day" so it stays the same all day for a given viewer. */
export function entryOfTheDay(date: Date = new Date()): FolkloreEntry {
  const dayOfYear = Math.floor(
    (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / 86_400_000,
  )
  return folkloreEntries[dayOfYear % folkloreEntries.length]
}
