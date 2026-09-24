import { MapPin, Phone } from "lucide-react"
import { Card, CardTitle, CardSubtitle } from "@/components/common/card"
import type { BackendProfile } from "@/lib/api"

export function PatientSafetySummary({ patient }: { patient: BackendProfile }) {
  const contacts = patient.emergencyContacts ?? []
  const location = patient.lastLocation

  return (
    <Card>
      <CardTitle>Safety</CardTitle>
      <CardSubtitle>{patient.firstName}&apos;s emergency contacts and last shared location.</CardSubtitle>

      <div className="mt-4 flex items-center gap-2 rounded-xl bg-muted/60 p-4">
        <MapPin className="size-4 shrink-0 text-muted-foreground" />
        {location ? (
          <p className="text-sm">
            Shared {new Date(location.updatedAt).toLocaleString()} —{" "}
            <a
              href={`https://www.google.com/maps?q=${location.lat},${location.lng}`}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary underline"
            >
              View on map
            </a>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No location has been shared yet.</p>
        )}
      </div>

      <ul className="mt-3 space-y-2">
        {contacts.length === 0 && <li className="text-sm text-muted-foreground">No emergency contacts added yet.</li>}
        {contacts.map((c) => (
          <li key={c._id ?? c.name} className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {c.name}
                {c.relation ? <span className="font-normal text-muted-foreground"> · {c.relation}</span> : null}
              </p>
              <p className="text-xs text-muted-foreground">{c.phone}</p>
            </div>
            <a
              href={`tel:${c.phone}`}
              className="tap-target inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"
            >
              <Phone className="size-3.5" /> Call
            </a>
          </li>
        ))}
      </ul>
    </Card>
  )
}
