"use client"

import { useEffect, useRef, useState } from "react"
import { Volume2, VolumeX } from "lucide-react"

/**
 * A small button that reads the given text aloud using the browser's
 * built-in Web Speech API (no external service, no API key). Renders
 * nothing if the browser doesn't support speech synthesis.
 */
export function ReadAloudButton({ text, className = "" }: { text: string; className?: string }) {
  const [supported, setSupported] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window)
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  if (!supported) return null

  function toggle() {
    const synth = window.speechSynthesis
    if (speaking) {
      synth.cancel()
      setSpeaking(false)
      return
    }
    synth.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.95
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    utteranceRef.current = utterance
    synth.speak(utterance)
    setSpeaking(true)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={speaking}
      aria-label={speaking ? "Stop reading aloud" : "Read this aloud"}
      className={`tap-target inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted ${className}`}
    >
      {speaking ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
      {speaking ? "Stop" : "Read aloud"}
    </button>
  )
}
