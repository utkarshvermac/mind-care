"use client"

import { useEffect, useRef, useState } from "react"
import { BookHeart, Mic, Music2, Plus, Sparkles, Square, Trash2, X } from "lucide-react"
import { AppShell } from "@/components/common/app-shell"
import { Card, CardSubtitle, CardTitle, SectionHeader } from "@/components/common/card"
import {
  addJournalEntry,
  addMusicMemory,
  deleteJournalEntry,
  deleteMusicMemory,
  getJournalEntries,
  getMusicMemories,
  getReminiscenceQuiz,
  type JournalEntryRow,
  type MusicMemoryRow,
} from "@/lib/api"
import { cn } from "@/lib/utils"

type Tab = "journal" | "music"

export default function MemoriesPage() {
  const [tab, setTab] = useState<Tab>("journal")

  return (
    <AppShell title="Memories" back={{ href: "/dashboard", label: "Dashboard" }}>
      <div className="flex flex-col gap-6">
        <SectionHeader title="Memories" subtitle="Your life story, in your own words, and the music that matters to you." />

        <div className="flex w-fit gap-1 rounded-xl bg-muted/60 p-1">
          <TabButton active={tab === "journal"} onClick={() => setTab("journal")} icon={BookHeart} label="Journal" />
          <TabButton active={tab === "music"} onClick={() => setTab("music")} icon={Music2} label="Music Memories" />
        </div>

        {tab === "journal" ? <JournalTab /> : <MusicTab />}
      </div>
    </AppShell>
  )
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: typeof BookHeart
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "tap-target flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
        active ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  )
}

/* --------------------------------- Journal --------------------------------- */

function JournalTab() {
  const [entries, setEntries] = useState<JournalEntryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState("")
  const [text, setText] = useState("")
  const [audioDataUrl, setAudioDataUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [recording, setRecording] = useState(false)
  const [recordError, setRecordError] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])

  const [quiz, setQuiz] = useState<{ question: string; answer: string }[] | null>(null)
  const [quizLoading, setQuizLoading] = useState(false)
  const [quizEmpty, setQuizEmpty] = useState(false)

  function load() {
    setLoading(true)
    getJournalEntries()
      .then((data) => setEntries(data.entries))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  async function startRecording() {
    setRecordError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data)
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" })
        stream.getTracks().forEach((t) => t.stop())
        const reader = new FileReader()
        reader.onload = () => setAudioDataUrl(reader.result as string)
        reader.readAsDataURL(blob)
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      setRecording(true)
    } catch {
      setRecordError("Couldn't access the microphone — check your browser's permission for this site.")
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    setRecording(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    try {
      await addJournalEntry({ title: title.trim(), text: text.trim(), audioDataUrl })
      setTitle("")
      setText("")
      setAudioDataUrl(null)
      setShowForm(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id))
    await deleteJournalEntry(id).catch(load)
  }

  async function handleGenerateQuiz() {
    setQuizLoading(true)
    setQuiz(null)
    try {
      const data = await getReminiscenceQuiz()
      setQuizEmpty(data.empty)
      setQuiz(data.questions)
    } catch {
      setQuiz([])
    } finally {
      setQuizLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Memory quiz</CardTitle>
            <CardSubtitle>A few gentle questions built from your own journal and family book.</CardSubtitle>
          </div>
          <Sparkles className="mt-1 size-5 shrink-0 text-muted-foreground" />
        </div>
        <button
          type="button"
          onClick={handleGenerateQuiz}
          disabled={quizLoading}
          className="tap-target mt-4 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          {quizLoading ? "Thinking…" : "Generate a memory quiz"}
        </button>

        {quiz && quizEmpty && (
          <p className="mt-4 text-sm text-muted-foreground">
            Add a few family members or journal entries first, then try again.
          </p>
        )}
        {quiz && !quizEmpty && quiz.length > 0 && (
          <ul className="mt-4 space-y-3">
            {quiz.map((q, i) => (
              <QuizItem key={i} question={q.question} answer={q.answer} />
            ))}
          </ul>
        )}
      </Card>

      <SectionHeader
        title="Journal entries"
        action={
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="tap-target inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-semibold text-primary-foreground"
          >
            {showForm ? <X className="size-4" /> : <Plus className="size-4" />}
            {showForm ? "Cancel" : "New entry"}
          </button>
        }
      />

      {showForm && (
        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give this memory a title"
              required
              className="rounded-xl border border-border bg-card px-4 py-3 text-sm"
            />
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write about it here (optional if you'd rather just record)…"
              rows={4}
              className="rounded-xl border border-border bg-card px-4 py-3 text-sm"
            />

            <div className="flex items-center gap-3">
              {!recording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  className="tap-target inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:border-primary hover:text-primary"
                >
                  <Mic className="size-4" /> Record a voice note
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="tap-target inline-flex animate-mic-pulse items-center gap-2 rounded-xl bg-destructive px-4 py-2.5 text-sm font-medium text-destructive-foreground"
                >
                  <Square className="size-4" /> Stop recording
                </button>
              )}
              {audioDataUrl && !recording && (
                <div className="flex items-center gap-2">
                  <audio controls src={audioDataUrl} className="h-9" />
                  <button type="button" onClick={() => setAudioDataUrl(null)} aria-label="Remove recording">
                    <Trash2 className="size-4 text-muted-foreground" />
                  </button>
                </div>
              )}
            </div>
            {recordError && <p className="text-sm text-destructive">{recordError}</p>}

            <button
              type="submit"
              disabled={saving}
              className="tap-target self-start rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground"
            >
              {saving ? "Saving…" : "Save entry"}
            </button>
          </form>
        </Card>
      )}

      {loading ? (
        <Card className="py-10 text-center text-muted-foreground">Loading…</Card>
      ) : entries.length === 0 ? (
        <Card className="py-10 text-center text-muted-foreground">No journal entries yet.</Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {entries.map((entry) => (
            <Card as="li" key={entry.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{entry.title}</CardTitle>
                  <CardSubtitle className="mt-0.5">{new Date(entry.createdAt).toLocaleDateString()}</CardSubtitle>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(entry.id)}
                  aria-label="Delete entry"
                  className="tap-target shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              {entry.text && <p className="mt-3 text-sm text-pretty">{entry.text}</p>}
              {entry.audioDataUrl && <audio controls src={entry.audioDataUrl} className="mt-3 h-9 w-full" />}
            </Card>
          ))}
        </ul>
      )}
    </div>
  )
}

function QuizItem({ question, answer }: { question: string; answer: string }) {
  const [revealed, setRevealed] = useState(false)
  return (
    <li className="rounded-xl bg-muted/60 p-4">
      <p className="font-medium">{question}</p>
      {revealed ? (
        <p className="mt-2 text-sm text-muted-foreground">{answer}</p>
      ) : (
        <button type="button" onClick={() => setRevealed(true)} className="mt-2 text-sm font-medium text-primary underline">
          Reveal answer
        </button>
      )}
    </li>
  )
}

/* ------------------------------ Music Memories ------------------------------ */

function MusicTab() {
  const [memories, setMemories] = useState<MusicMemoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState("")
  const [artist, setArtist] = useState("")
  const [note, setNote] = useState("")
  const [link, setLink] = useState("")
  const [saving, setSaving] = useState(false)

  function load() {
    setLoading(true)
    getMusicMemories()
      .then((data) => setMemories(data.memories))
      .catch(() => setMemories([]))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    try {
      await addMusicMemory({ title: title.trim(), artist: artist.trim(), note: note.trim(), link: link.trim() || null })
      setTitle("")
      setArtist("")
      setNote("")
      setLink("")
      setShowForm(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setMemories((prev) => prev.filter((m) => m.id !== id))
    await deleteMusicMemory(id).catch(load)
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Songs that matter"
        subtitle="A curated list, not a music player — add a link if you'd like to open it in your usual music app."
        action={
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="tap-target inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-semibold text-primary-foreground"
          >
            {showForm ? <X className="size-4" /> : <Plus className="size-4" />}
            {showForm ? "Cancel" : "Add a song"}
          </button>
        }
      />

      {showForm && (
        <Card>
          <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Song title"
              required
              className="rounded-xl border border-border bg-card px-4 py-3 text-sm"
            />
            <input
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="Artist (optional)"
              className="rounded-xl border border-border bg-card px-4 py-3 text-sm"
            />
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why it matters (optional)"
              className="rounded-xl border border-border bg-card px-4 py-3 text-sm sm:col-span-2"
            />
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="Link (YouTube, Spotify — optional)"
              className="rounded-xl border border-border bg-card px-4 py-3 text-sm sm:col-span-2"
            />
            <button
              type="submit"
              disabled={saving}
              className="tap-target self-start rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground sm:col-span-2"
            >
              {saving ? "Saving…" : "Save song"}
            </button>
          </form>
        </Card>
      )}

      {loading ? (
        <Card className="py-10 text-center text-muted-foreground">Loading…</Card>
      ) : memories.length === 0 ? (
        <Card className="py-10 text-center text-muted-foreground">No songs added yet.</Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {memories.map((m) => (
            <Card as="li" key={m.id} className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent/12 text-accent">
                <Music2 className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{m.title}</p>
                {m.artist && <p className="text-sm text-muted-foreground">{m.artist}</p>}
                {m.note && <p className="mt-1 text-sm text-pretty">{m.note}</p>}
                {m.link && (
                  <a href={m.link} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm font-medium text-primary underline">
                    Open
                  </a>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleDelete(m.id)}
                aria-label={`Remove ${m.title}`}
                className="tap-target shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </Card>
          ))}
        </ul>
      )}
    </div>
  )
}
