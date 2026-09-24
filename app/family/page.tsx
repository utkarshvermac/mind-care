"use client"

import { useEffect, useState } from "react"
import { Camera, Plus, Trash2, UserRound, Users, X } from "lucide-react"
import { AppShell } from "@/components/common/app-shell"
import { Card, CardSubtitle, CardTitle, SectionHeader } from "@/components/common/card"
import { addFamilyMember, deleteFamilyMember, getFamilyMembers, type FamilyMemberRow } from "@/lib/api"
import { fileToCompressedDataUrl } from "@/lib/image-utils"

export default function FamilyPage() {
  const [members, setMembers] = useState<FamilyMemberRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState("")
  const [relation, setRelation] = useState("")
  const [note, setNote] = useState("")
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function load() {
    setLoading(true)
    getFamilyMembers()
      .then((data) => setMembers(data.members))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setPhotoDataUrl(await fileToCompressedDataUrl(file))
    } catch {
      setError("Could not process that photo — please try a different image.")
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !relation.trim()) return
    setSaving(true)
    setError(null)
    try {
      await addFamilyMember({ name: name.trim(), relation: relation.trim(), note: note.trim(), photoDataUrl })
      setName("")
      setRelation("")
      setNote("")
      setPhotoDataUrl(null)
      setShowForm(false)
      load()
    } catch {
      setError("Couldn't save that family member — please try again.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setMembers((prev) => prev.filter((m) => m.id !== id))
    await deleteFamilyMember(id).catch(load)
  }

  return (
    <AppShell title="Family & Faces" back={{ href: "/dashboard", label: "Dashboard" }}>
      <div className="flex flex-col gap-6">
        <SectionHeader
          title="Your family book"
          subtitle="Add the people in your life — this also powers the Family & Faces game."
          action={
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="tap-target inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-semibold text-primary-foreground"
            >
              {showForm ? <X className="size-4" /> : <Plus className="size-4" />}
              {showForm ? "Cancel" : "Add family member"}
            </button>
          }
        />

        {showForm && (
          <Card>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <label className="flex size-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-muted/60 text-muted-foreground hover:border-primary/50">
                  {photoDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoDataUrl} alt="" className="size-full object-cover" />
                  ) : (
                    <Camera className="size-6" />
                  )}
                  <input type="file" accept="image/*" onChange={handlePhotoChange} className="sr-only" />
                </label>
                <p className="text-sm text-muted-foreground">Tap to add a photo (optional, but makes the game more fun).</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name"
                  required
                  className="rounded-xl border border-border bg-card px-4 py-3 text-sm"
                />
                <input
                  value={relation}
                  onChange={(e) => setRelation(e.target.value)}
                  placeholder="Relation (e.g. Daughter, Neighbour)"
                  required
                  className="rounded-xl border border-border bg-card px-4 py-3 text-sm"
                />
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="A memory or note about them (optional)"
                rows={2}
                className="rounded-xl border border-border bg-card px-4 py-3 text-sm"
              />

              {error && <p className="text-sm text-destructive">{error}</p>}

              <button
                type="submit"
                disabled={saving}
                className="tap-target self-start rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground"
              >
                {saving ? "Saving…" : "Save family member"}
              </button>
            </form>
          </Card>
        )}

        {loading ? (
          <Card className="py-10 text-center text-muted-foreground">Loading…</Card>
        ) : members.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-secondary/12 text-secondary">
              <Users className="size-7" />
            </span>
            <div>
              <p className="font-medium">No family members added yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Add a few to start building your family book.</p>
            </div>
          </Card>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((m) => (
              <Card as="li" key={m.id} className="flex items-start gap-4">
                <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 text-primary">
                  {m.photoDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.photoDataUrl} alt="" className="size-full object-cover" />
                  ) : (
                    <UserRound className="size-8" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base">{m.name}</CardTitle>
                  <CardSubtitle className="mt-0.5">{m.relation}</CardSubtitle>
                  {m.note && <p className="mt-2 text-sm text-muted-foreground">{m.note}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(m.id)}
                  aria-label={`Remove ${m.name}`}
                  className="tap-target shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </Card>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  )
}
