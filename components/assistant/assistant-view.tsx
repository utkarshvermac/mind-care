"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Bot, Mic, MicOff, Send, Trash2, Volume2, VolumeX } from "lucide-react"
import { cn } from "@/lib/utils"
import { useApp } from "@/components/app-provider"
import { getAssistantReply, greetingMessage, suggestedPrompts, type ChatMessage } from "@/lib/assistant"
import { sendAssistantMessage, getAssistantHistory, clearAssistantHistory, ApiError } from "@/lib/api"
import { STORAGE_KEYS, readValue, writeValue, removeValue } from "@/lib/storage"

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
}

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike
    webkitSpeechRecognition?: new () => SpeechRecognitionLike
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
}

export function AssistantView() {
  const { preferences } = useApp()
  const [messages, setMessages] = useState<ChatMessage[]>([greetingMessage])
  const [input, setInput] = useState("")
  const [thinking, setThinking] = useState(false)
  const [listening, setListening] = useState(false)
  const [speakReplies, setSpeakReplies] = useState(false)
  const [voiceError, setVoiceError] = useState<string | null>(null)

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const voiceSupported = useMemo(() => getRecognitionCtor() !== null, [])
  const speechSupported = typeof window !== "undefined" && "speechSynthesis" in window

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { messages: history } = await getAssistantHistory()
        if (cancelled) return
        if (history.length > 0) {
          const mapped: ChatMessage[] = history.map((m) => ({ id: m.id, role: m.role, text: m.text, at: m.at }))
          setMessages(mapped)
          return
        }
      } catch {
        /* backend unreachable — fall back to local cache below */
      }
      const saved = readValue<ChatMessage[]>(STORAGE_KEYS.chatHistory, [])
      if (saved.length > 0 && !cancelled) setMessages(saved)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, thinking])

  const speak = useCallback(
    (text: string) => {
      if (!speakReplies || !speechSupported) return
      try {
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.rate = 0.92
        utterance.pitch = 1
        window.speechSynthesis.speak(utterance)
      } catch {
        /* speech is a nice-to-have */
      }
    },
    [speakReplies, speechSupported],
  )

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim()
      if (!text || thinking) return

      const userMessage: ChatMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        text,
        at: new Date().toISOString(),
      }
      setMessages((prev) => {
        const next = [...prev, userMessage]
        writeValue(STORAGE_KEYS.chatHistory, next)
        return next
      })
      setInput("")
      setThinking(true)

      const reply = await (async () => {
        try {
          const saved = await sendAssistantMessage(text)
          return saved.text
        } catch (err) {
          if (err instanceof ApiError && err.status === 401) {
            return "Please log in again to keep chatting with me."
          }
          return getAssistantReply(text)
        }
      })()
      const botMessage: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        text: reply,
        at: new Date().toISOString(),
      }
      setMessages((prev) => {
        const next = [...prev, botMessage]
        writeValue(STORAGE_KEYS.chatHistory, next)
        return next
      })
      setThinking(false)
      speak(reply)
    },
    [speak, thinking],
  )

  const toggleListening = useCallback(() => {
    setVoiceError(null)
    const Ctor = getRecognitionCtor()
    if (!Ctor) {
      setVoiceError("Voice input is not supported in this browser. You can still type your message.")
      return
    }
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }
    try {
      const recognition = new Ctor()
      recognition.lang = "en-IN"
      recognition.continuous = false
      recognition.interimResults = false
      recognition.onresult = (event) => {
        const transcript = event.results[0]?.[0]?.transcript ?? ""
        if (transcript) void send(transcript)
      }
      recognition.onerror = () => {
        setVoiceError("I could not hear that. Please check your microphone permission and try again.")
        setListening(false)
      }
      recognition.onend = () => setListening(false)
      recognitionRef.current = recognition
      recognition.start()
      setListening(true)
    } catch {
      setVoiceError("Voice input could not start. Please type instead.")
      setListening(false)
    }
  }, [listening, send])

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel()
    }
  }, [])

  const clearChat = () => {
    removeValue(STORAGE_KEYS.chatHistory)
    setMessages([greetingMessage])
    if (speechSupported) window.speechSynthesis.cancel()
    void clearAssistantHistory().catch(() => {
      /* best-effort — local state is already cleared */
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="surface flex flex-wrap items-center gap-4 p-5">
        <span className="relative flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
          <Bot className="size-6" aria-hidden="true" />
          <span className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-card bg-success" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-semibold tracking-tight">MindCare Assistant</h2>
          <p className="text-sm text-muted-foreground">
            {listening ? "Listening…" : thinking ? "Thinking…" : "Always here. Type or speak."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {speechSupported ? (
            <button
              type="button"
              onClick={() => {
                if (speakReplies) window.speechSynthesis.cancel()
                setSpeakReplies((v) => !v)
              }}
              aria-pressed={speakReplies}
              className={cn(
                "tap-target flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                speakReplies
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {speakReplies ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
              <span className="hidden sm:inline">Read aloud</span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={clearChat}
            className="tap-target flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
          >
            <Trash2 className="size-4" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>

      <div className="surface flex flex-col overflow-hidden p-0">
        <div ref={scrollRef} className="flex flex-col gap-4 overflow-y-auto p-4 sm:p-6" style={{ height: "clamp(360px, 52vh, 560px)" }}>
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn("flex flex-col gap-1", message.role === "user" ? "items-end" : "items-start")}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed sm:max-w-[75%]",
                  message.role === "user"
                    ? "rounded-br-md bg-primary text-primary-foreground"
                    : "rounded-bl-md bg-muted text-foreground",
                )}
              >
                {message.text}
              </div>
              <span className="px-1 text-xs text-muted-foreground">{timeLabel(message.at)}</span>
            </div>
          ))}

          {thinking ? (
            <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-muted px-4 py-4">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="size-2 animate-bounce rounded-full bg-muted-foreground/60"
                  style={{ animationDelay: `${i * 140}ms` }}
                />
              ))}
              <span className="sr-only">Assistant is typing</span>
            </div>
          ) : null}
        </div>

        <div className="border-t border-border p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap gap-2">
            {suggestedPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => void send(prompt)}
                disabled={thinking}
                className="rounded-full border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/8 hover:text-primary disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault()
              void send(input)
            }}
            className="flex items-center gap-2"
          >
            <label htmlFor="assistant-input" className="sr-only">
              Message the assistant
            </label>
            <input
              id="assistant-input"
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return
                if (event.nativeEvent.isComposing || event.keyCode === 229) return
              }}
              placeholder={listening ? "Listening…" : "Type your message…"}
              className="tap-target min-w-0 flex-1 rounded-xl border border-input bg-background px-4 py-3 text-[15px] outline-none transition-colors focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/30"
            />
            {voiceSupported ? (
              <button
                type="button"
                onClick={toggleListening}
                aria-label={listening ? "Stop listening" : "Speak your message"}
                aria-pressed={listening}
                className={cn(
                  "flex size-12 shrink-0 items-center justify-center rounded-xl border transition-colors",
                  listening
                    ? "animate-pulse border-destructive/30 bg-destructive/12 text-destructive"
                    : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {listening ? <MicOff className="size-5" /> : <Mic className="size-5" />}
              </button>
            ) : null}
            <button
              type="submit"
              disabled={!input.trim() || thinking}
              aria-label="Send message"
              className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <Send className="size-5" />
            </button>
          </form>

          {voiceError ? (
            <p role="status" className="mt-3 text-sm text-warning">
              {voiceError}
            </p>
          ) : null}
          {!voiceSupported ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Voice input needs a Chromium based browser. Typing works everywhere.
            </p>
          ) : null}
          {preferences.elderMode ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Elder mode is on, so text is larger and buttons are easier to tap.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
