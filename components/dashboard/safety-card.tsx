"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, MapPin, Phone, Plus, Trash2, X } from "lucide-react"
import { Card, CardTitle, CardSubtitle } from "@/components/common/card"
import {
  addEmergencyContact,
  deleteEmergencyContact,
  getEmergencyContacts,
  shareLocation,
  triggerSOS,
  type EmergencyContact,
} from "@/lib/api"

export function SafetyCard() {
  const [contacts, setContacts] = useState<EmergencyContact[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [relation, setRelation] = useState("")
  const [saving, setSaving] = useState(false)
  const [locationStatus, setLocationStatus] = useState<"idle" | "sharing" | "shared" | "error">("idle")
  const [sosStatus, setSosStatus] = useState<"idle" | "confirm" | "sending" | "sent">("idle")

  useEffect(() => {
    getEmergencyContacts()
      .then((data) => setContacts(data.contacts))
      .catch(() => setContacts([]))
      .finally(() => setLoading(false))
  }, [])

  async function handleAddContact(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) return
    setSaving(true)
    try {
      const data = await addEmergencyContact({ name: name.trim(), phone: phone.trim(), relation: relation.trim() })
      setContacts(data.contacts)
      setName("")
      setPhone("")
      setRelation("")
      setShowAdd(false)
    } catch {
      /* keep the form open so they can retry */
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(contactId?: string) {
    if (!contactId) return
    const data = await deleteEmergencyContact(contactId).catch(() => null)
    if (data) setContacts(data.contacts)
  }

  function handleShareLocation() {
    if (!("geolocation" in navigator)) {
      setLocationStatus("error")
      return
    }
    setLocationStatus("sharing")
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await shareLocation(position.coords.latitude, position.coords.longitude)
          setLocationStatus("shared")
        } catch {
          setLocationStatus("error")
        }
      },
      () => setLocationStatus("error"),
      { enableHighAccuracy: false, timeout: 10_000 },
    )
  }

  async function handleSos() {
    if (sosStatus !== "confirm") {
      setSosStatus("confirm")
      return
    }
    setSosStatus("sending")
    try {
      await triggerSOS()
      setSosStatus("sent")
    } catch {
      setSosStatus("idle")
    }
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <CardTitle>Safety</CardTitle>
          <CardSubtitle>Emergency contacts, location sharing, and an SOS alert to your caregiver.</CardSubtitle>
        </div>
        <AlertTriangle className="mt-1 size-5 shrink-0 text-muted-foreground" />
      </div>

      {/* SOS */}
      <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        {sosStatus === "sent" ? (
          <p className="text-center text-sm font-medium text-destructive">
            Alert sent. Your linked caregiver has been notified.
          </p>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-muted-foreground">
              {sosStatus === "confirm" ? "Tap again to confirm and notify your caregiver right away." : "Need help right now?"}
            </p>
            <button
              type="button"
              onClick={handleSos}
              disabled={sosStatus === "sending"}
              className={`tap-target inline-flex items-center gap-2 rounded-full px-8 py-3 text-base font-semibold text-destructive-foreground shadow-sm transition ${
                sosStatus === "confirm" ? "animate-mic-pulse bg-destructive" : "bg-destructive/90 hover:bg-destructive"
              }`}
            >
              {sosStatus === "sending" ? "Sending…" : sosStatus === "confirm" ? "Confirm SOS" : "SOS — Send alert"}
            </button>
            {sosStatus === "confirm" && (
              <button type="button" onClick={() => setSosStatus("idle")} className="text-xs text-muted-foreground underline">
                Cancel
              </button>
            )}
          </div>
        )}
      </div>

      {/* Share location */}
      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-muted/60 p-4">
        <div className="flex items-center gap-2">
          <MapPin className="size-4 text-muted-foreground" />
          <p className="text-sm">
            {locationStatus === "shared"
              ? "Location shared with your caregiver."
              : locationStatus === "error"
                ? "Couldn't get your location — check location permission."
                : "Share your current location with your caregiver."}
          </p>
        </div>
        <button
          type="button"
          onClick={handleShareLocation}
          disabled={locationStatus === "sharing"}
          className="tap-target shrink-0 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          {locationStatus === "sharing" ? "Sharing…" : "Share now"}
        </button>
      </div>

      {/* Emergency contacts */}
      <div className="mt-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Emergency contacts</p>
          <button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary"
          >
            {showAdd ? <X className="size-4" /> : <Plus className="size-4" />}
            {showAdd ? "Cancel" : "Add"}
          </button>
        </div>

        {showAdd && (
          <form onSubmit={handleAddContact} className="mt-3 grid gap-2 rounded-xl bg-muted/60 p-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
              required
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
              required
            />
            <input
              value={relation}
              onChange={(e) => setRelation(e.target.value)}
              placeholder="Relation (e.g. Daughter)"
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={saving}
              className="mt-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
            >
              {saving ? "Saving…" : "Save contact"}
            </button>
          </form>
        )}

        <ul className="mt-3 space-y-2">
          {loading && <li className="text-sm text-muted-foreground">Loading…</li>}
          {!loading && contacts.length === 0 && (
            <li className="text-sm text-muted-foreground">No emergency contacts added yet.</li>
          )}
          {contacts.map((c) => (
            <li key={c._id ?? c.name} className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {c.name}
                  {c.relation ? <span className="font-normal text-muted-foreground"> · {c.relation}</span> : null}
                </p>
                <p className="text-xs text-muted-foreground">{c.phone}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <a
                  href={`tel:${c.phone}`}
                  className="tap-target inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"
                >
                  <Phone className="size-3.5" /> Call
                </a>
                <button
                  type="button"
                  onClick={() => handleDelete(c._id)}
                  aria-label={`Remove ${c.name}`}
                  className="tap-target rounded-full p-1.5 text-muted-foreground hover:bg-muted"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}
