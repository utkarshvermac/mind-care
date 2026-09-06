// Real LLM integration using Google's Gemini API (free tier available).
// This is what makes the assistant sound like an actual AI instead of a
// fixed set of rule-based replies. If GEMINI_API_KEY is not set, every
// function here throws, and assistantService.js catches that and falls
// back to the rule-based engine automatically — the app keeps working
// either way.

const config = require("../config")

const MODEL = "gemini-2.0-flash"
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

function isConfigured() {
  return Boolean(config.geminiApiKey)
}

/**
 * @param {string} systemPrompt - persona + situational context, sent as the model's instructions
 * @param {{role: "user"|"assistant", text: string}[]} history - prior turns, oldest first
 * @param {string} message - the new user message to reply to
 * @returns {Promise<string>}
 */
async function generateReply(systemPrompt, history, message) {
  if (!isConfigured()) {
    throw new Error("GEMINI_API_KEY is not set")
  }

  const contents = [
    ...history.slice(-10).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.text }],
    })),
    { role: "user", parts: [{ text: message }] },
  ]

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12000)

  try {
    const res = await fetch(`${API_URL}?key=${config.geminiApiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 200,
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        ],
      }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => "")
      throw new Error(`Gemini API error ${res.status}: ${body.slice(0, 200)}`)
    }

    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("").trim()
    if (!text) throw new Error("Gemini returned an empty response")

    return text
  } finally {
    clearTimeout(timeout)
  }
}

module.exports = { generateReply, isConfigured }
