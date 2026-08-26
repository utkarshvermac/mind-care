"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Bot, Brain, Eye, EyeOff, HeartHandshake, Loader2, Lock, Mail, ShieldCheck, Sparkles } from "lucide-react"
import { useApp } from "@/components/app-provider"
import { Logo } from "@/components/common/logo"
import { RoleSelector } from "@/components/auth/role-selector"
import { loginUser } from "@/lib/api"
import { STORAGE_KEYS, readValue } from "@/lib/storage"
import { cn } from "@/lib/utils"
import type { Role } from "@/lib/mock-data"

type StoredAccount = { name: string; email: string; role: Role }

const highlights = [
  { icon: Brain, title: "Playable cognitive games", detail: "Card Match, Pattern Recall and Word Recall with real scoring." },
  { icon: Bot, title: "Always-on assistant", detail: "Voice or text support that runs entirely in the browser." },
  { icon: HeartHandshake, title: "Caregiver visibility", detail: "Weekly trends, accuracy and gentle alerts in one view." },
]

export function LoginView() {
  const router = useRouter()
  const { login, role, ready } = useApp()
  const [selectedRole, setSelectedRole] = useState<Role>("patient")
  const [email, setEmail] = useState("rahul.sharma@mindcare.demo")
  const [password, setPassword] = useState("mindcare")
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [pending, setPending] = useState<Role | null>(null)

  useEffect(() => {
    if (ready && role) router.replace("/dashboard")
  }, [ready, role, router])

  const go = async (next: Role) => {
    setPending(next)
    await loginUser(next)
    const accounts = readValue<StoredAccount[]>(STORAGE_KEYS.accounts, [])
    const match = accounts.find((a) => a.email.toLowerCase() === email.toLowerCase())
    login(match?.role ?? next, match?.name)
    router.push("/dashboard")
  }

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Brand panel */}
      <section className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-primary via-primary to-accent px-6 py-10 text-primary-foreground sm:px-10 lg:w-[46%] lg:py-14">
        <div className="pointer-events-none absolute -right-24 top-10 size-72 rounded-full bg-primary-foreground/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 size-64 rounded-full bg-secondary/25 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <Logo size={48} className="bg-primary-foreground/15 shadow-none" />
          <span className="flex flex-col leading-tight">
            <span className="font-display text-xl font-semibold tracking-tight">MindCare</span>
            <span className="text-sm text-primary-foreground/75">Memory & cognitive wellness</span>
          </span>
        </div>

        <div className="relative mt-10 max-w-md lg:mt-0">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1.5 text-xs font-semibold">
            <Sparkles className="size-3.5" aria-hidden="true" />
            Smart India Hackathon prototype
          </span>
          <h1 className="mt-5 font-display text-3xl font-semibold leading-tight tracking-tight text-balance sm:text-4xl">
            Memory care that feels calm, not clinical.
          </h1>
          <p className="mt-4 text-primary-foreground/85 text-pretty">
            MindCare keeps daily cognitive exercise simple for patients over 60, and gives their caregivers a clear
            picture of how the week is going.
          </p>

          <ul className="mt-8 flex flex-col gap-4">
            {highlights.map((item) => (
              <li key={item.title} className="flex items-start gap-3">
                <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-foreground/15">
                  <item.icon className="size-5" aria-hidden="true" />
                </span>
                <span className="flex flex-col">
                  <span className="font-medium">{item.title}</span>
                  <span className="text-sm text-primary-foreground/75">{item.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative mt-10 flex items-center gap-2 text-sm text-primary-foreground/70">
          <ShieldCheck className="size-4" aria-hidden="true" />
          Demo data only. Nothing leaves this device.
        </p>
      </section>

      {/* Form panel */}
      <section className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Welcome back</h2>
          <p className="mt-2 text-muted-foreground">Choose who is using MindCare today.</p>

          <div className="mt-6">
            <RoleSelector value={selectedRole} onChange={setSelectedRole} />
          </div>

          <form
            className="mt-6 flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              void go(selectedRole)
            }}
          >
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-14 w-full rounded-xl border border-input bg-card pl-12 pr-4 text-[15px] outline-none transition-colors focus:border-primary"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-14 w-full rounded-xl border border-input bg-card pl-12 pr-14 text-[15px] outline-none transition-colors focus:border-primary"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                >
                  {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="size-5 rounded border-input accent-primary"
              />
              Remember me on this device
            </label>

            <button
              type="submit"
              disabled={pending !== null}
              className="tap-target mt-1 flex h-14 items-center justify-center gap-2 rounded-xl bg-primary text-[16px] font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:-translate-y-0.5 disabled:opacity-70"
            >
              {pending === selectedRole ? (
                <Loader2 className="size-5 animate-spin" aria-hidden="true" />
              ) : (
                <>
                  Log in as {selectedRole === "patient" ? "patient" : "caregiver"}
                  <ArrowRight className="size-5" aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          <div className="my-6 flex items-center gap-4">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Or try the demo</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            {(["patient", "caregiver"] as Role[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => void go(r)}
                disabled={pending !== null}
                className={cn(
                  "tap-target flex h-14 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card font-medium transition-colors hover:border-primary hover:text-primary disabled:opacity-70",
                )}
              >
                {pending === r ? <Loader2 className="size-5 animate-spin" /> : null}
                Continue as {r === "patient" ? "Patient" : "Caregiver"}
              </button>
            ))}
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            No account needed. This prototype runs fully in your browser with fictional data.
          </p>
          <p className="mt-3 text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link href="/signup" className="font-semibold text-primary hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </section>
    </div>
  )
}
