"use client"

import { useEffect, useState } from "react"
import { Printer } from "lucide-react"
import { AppShell } from "@/components/common/app-shell"
import { Card, CardSubtitle, CardTitle } from "@/components/common/card"
import { useApp } from "@/components/app-provider"
import { getAnalytics, getCaregiverData, getPatientData, type BackendAlert, type BackendAnalytics, type BackendProfile } from "@/lib/api"

export default function ReportsPage() {
  const { role } = useApp()
  const [profile, setProfile] = useState<BackendProfile | null>(null)
  const [analytics, setAnalytics] = useState<BackendAnalytics | null>(null)
  const [alerts, setAlerts] = useState<BackendAlert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!role) return
    setLoading(true)
    ;(async () => {
      try {
        if (role === "caregiver") {
          const overview = await getCaregiverData()
          setProfile(overview.patient)
          setAlerts(overview.alerts)
          if (overview.patient) setAnalytics(await getAnalytics(overview.patient.id))
        } else {
          const data = await getPatientData()
          setProfile(data.profile)
          setAnalytics(await getAnalytics())
        }
      } catch {
        /* leave sections empty — the page still renders with what it has */
      } finally {
        setLoading(false)
      }
    })()
  }, [role])

  return (
    <AppShell title="Care Report" back={{ href: "/dashboard", label: "Dashboard" }}>
      <div className="flex flex-col gap-6">
        <div className="no-print flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight">
              {role === "caregiver" ? "Care report" : "Your report"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A summary you can print or save as a PDF — useful to bring to a doctor's visit.
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="tap-target inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-semibold text-primary-foreground"
          >
            <Printer className="size-4" /> Print / Save as PDF
          </button>
        </div>

        {loading ? (
          <Card className="py-10 text-center text-muted-foreground">Loading…</Card>
        ) : !profile ? (
          <Card className="py-10 text-center text-muted-foreground">
            {role === "caregiver" ? "Link a patient to see their report here." : "No data to report yet."}
          </Card>
        ) : (
          <div className="print-page surface flex flex-col gap-6 p-6 sm:p-8">
            <header className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h1 className="font-display text-2xl font-semibold">MindCare Care Report</h1>
                <p className="text-sm text-muted-foreground">Generated {new Date().toLocaleString()}</p>
              </div>
            </header>

            <section>
              <h2 className="font-display text-lg font-semibold">Patient</h2>
              <dl className="mt-2 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <ReportStat label="Name" value={profile.name} />
                <ReportStat label="Age" value={profile.age != null ? String(profile.age) : "—"} />
                <ReportStat label="Condition" value={profile.condition ?? "—"} />
                <ReportStat label="Care since" value={profile.since ?? "—"} />
              </dl>
            </section>

            {analytics && (
              <section>
                <h2 className="font-display text-lg font-semibold">Cognitive activity</h2>
                <dl className="mt-2 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <ReportStat label="Sessions" value={String(analytics.stats.sessions)} />
                  <ReportStat label="Average accuracy" value={`${analytics.stats.accuracy}%`} />
                  <ReportStat label="Best score" value={String(analytics.stats.best)} />
                  <ReportStat label="Minutes played" value={String(analytics.stats.minutes)} />
                </dl>

                <table className="mt-4 w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">Day</th>
                      <th className="py-2 pr-4 font-medium">Score</th>
                      <th className="py-2 font-medium">Activities</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.weeklyScores.map((row) => (
                      <tr key={row.date} className="border-b border-border/60">
                        <td className="py-2 pr-4">{row.label}</td>
                        <td className="py-2 pr-4">{row.score}</td>
                        <td className="py-2">{row.activities}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <table className="mt-4 w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">Game</th>
                      <th className="py-2 pr-4 font-medium">Accuracy</th>
                      <th className="py-2 font-medium">Sessions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.gamePerformance.map((row) => (
                      <tr key={row.gameId} className="border-b border-border/60">
                        <td className="py-2 pr-4">{row.game}</td>
                        <td className="py-2 pr-4">{row.accuracy}%</td>
                        <td className="py-2">{row.sessions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {role === "caregiver" && (
              <section>
                <h2 className="font-display text-lg font-semibold">Recent alerts</h2>
                {alerts.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">No alerts on record.</p>
                ) : (
                  <ul className="mt-2 space-y-2 text-sm">
                    {alerts.map((a) => (
                      <li key={a.id} className="rounded-lg bg-muted/60 px-3 py-2">
                        <span className="font-medium">{a.title}</span> — {a.detail}
                        <span className="ml-2 text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            <p className="text-xs text-muted-foreground">
              This report is generated from self-reported app activity and is not a clinical diagnosis. Share it with a
              healthcare provider for context alongside a proper evaluation.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  )
}

function ReportStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}
