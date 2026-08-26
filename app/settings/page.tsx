"use client"

import { Bell, Eye, Moon, RotateCcw, Settings2, Volume2 } from "lucide-react"
import { AppShell } from "@/components/common/app-shell"
import { Card } from "@/components/common/card"
import { useApp } from "@/components/app-provider"

export default function SettingsPage() {
  const { preferences, setPreference } = useApp()

  return (
    <AppShell title="Settings">
      <div className="flex flex-col gap-6">
        <Card>
          <div className="flex items-start gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Settings2 className="size-5" />
            </span>
            <div>
              <h2 className="font-display text-xl font-semibold">Personalise MindCare</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                These settings work locally in the browser. They are ready to be connected to a backend later.
              </p>
            </div>
          </div>

          <div className="mt-6 divide-y divide-border">
            <SettingRow
              icon={<Moon />}
              title="Dark mode"
              description="Use a darker interface in low-light environments."
              control={
                <Toggle
                  checked={preferences.theme === "dark"}
                  label="Toggle dark mode"
                  onChange={(checked) => setPreference("theme", checked ? "dark" : "light")}
                />
              }
            />
            <SettingRow
              icon={<Eye />}
              title="Elder mode"
              description="Larger text and bigger touch targets for easier use."
              control={
                <Toggle
                  checked={preferences.elderMode}
                  label="Toggle elder mode"
                  onChange={(checked) => setPreference("elderMode", checked)}
                />
              }
            />
            <SettingRow
              icon={<Bell />}
              title="Notifications"
              description="Keep reminder preferences enabled for the demo."
              control={
                <Toggle
                  checked={preferences.notifications}
                  label="Toggle notifications"
                  onChange={(checked) => setPreference("notifications", checked)}
                />
              }
            />
            <SettingRow
              icon={<Volume2 />}
              title="Sound"
              description="Enable sound preferences for future activities."
              control={
                <Toggle
                  checked={preferences.sound}
                  label="Toggle sound"
                  onChange={(checked) => setPreference("sound", checked)}
                />
              }
            />
          </div>
        </Card>

        <Card>
          <h2 className="font-display text-lg font-semibold">Motion & text</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {(["normal", "large", "xlarge"] as const).map((scale) => (
              <button
                key={scale}
                type="button"
                onClick={() => setPreference("fontScale", scale)}
                className={`tap-target rounded-xl border-2 px-4 py-4 text-left transition-colors ${
                  preferences.fontScale === scale
                    ? "border-primary bg-primary/8 text-primary"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <span className="block font-semibold capitalize">{scale === "xlarge" ? "Extra large" : scale}</span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {scale === "normal" ? "Default text" : scale === "large" ? "Comfortable text" : "Maximum readability"}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-4 rounded-xl bg-muted/60 p-4">
            <div>
              <p className="font-medium">Reduce motion</p>
              <p className="text-sm text-muted-foreground">Minimise animations and transitions.</p>
            </div>
            <Toggle
              checked={preferences.reduceMotion}
              label="Toggle reduced motion"
              onChange={(checked) => setPreference("reduceMotion", checked)}
            />
          </div>
        </Card>

        <Card>
          <div className="flex items-start gap-3">
            <RotateCcw className="mt-0.5 size-5 text-muted-foreground" />
            <div>
              <h2 className="font-display font-semibold">Frontend-only note</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Login, games, analytics, assistant and preferences currently use demo data and LocalStorage. No
                backend connection is required to run this version.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  )
}

function SettingRow({
  icon,
  title,
  description,
  control,
}: {
  icon: React.ReactNode
  title: string
  description: string
  control: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-5 py-5">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          {icon}
        </span>
        <div>
          <p className="font-medium">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {control}
    </div>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full p-1 transition-colors ${
        checked ? "bg-primary" : "bg-muted-foreground/30"
      }`}
    >
      <span
        className={`block size-5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  )
}
