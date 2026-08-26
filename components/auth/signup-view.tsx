"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Eye, EyeOff, Lock, Loader2, Mail, ShieldCheck, User } from "lucide-react"
import { useApp } from "@/components/app-provider"
import { Logo } from "@/components/common/logo"
import { RoleSelector } from "@/components/auth/role-selector"
import { STORAGE_KEYS, readValue, writeValue } from "@/lib/storage"
import type { Role } from "@/lib/mock-data"

type StoredAccount = { name: string; email: string; role: Role }

export function SignupView() {
  const router = useRouter()
  const { login, role, ready } = useApp()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role>("patient")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (ready && role) router.replace("/dashboard")
  }, [ready, role, router])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError("Please tell us your name.")
      return
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Please enter a valid email address.")
      return
    }
    if (password.length < 6) {
      setError("Password should be at least 6 characters.")
      return
    }

    setPending(true)

    // Frontend-only demo: accounts are stored locally, not sent anywhere.
    // Swap this block for a real POST /auth/signup call once a backend exists.
    const accounts = readValue<StoredAccount[]>(STORAGE_KEYS.accounts, [])
    const exists = accounts.some((a) => a.email.toLowerCase() === email.toLowerCase())
    if (!exists) {
      writeValue(STORAGE_KEYS.accounts, [...accounts, { name: name.trim(), email, role: selectedRole }])
    }

    await new Promise((resolve) => setTimeout(resolve, 500))
    login(selectedRole, name.trim())
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
          <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight text-balance sm:text-4xl">
            Set up your MindCare account.
          </h1>
          <p className="mt-4 text-primary-foreground/85 text-pretty">
            Whether you are joining as a patient or a caregiver, this only takes a minute — and everything stays on
            your device.
          </p>
        </div>

        <p className="relative mt-10 flex items-center gap-2 text-sm text-primary-foreground/70">
          <ShieldCheck className="size-4" aria-hidden="true" />
          Demo data only. Nothing leaves this device.
        </p>
      </section>

      {/* Form panel */}
      <section className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Create your account</h2>
          <p className="mt-2 text-muted-foreground">Tell us a little about you.</p>

          <div className="mt-6">
            <RoleSelector value={selectedRole} onChange={setSelectedRole} />
          </div>

          <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <label htmlFor="name" className="text-sm font-medium">
                Full name
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-14 w-full rounded-xl border border-input bg-card pl-12 pr-4 text-[15px] outline-none transition-colors focus:border-primary"
                  placeholder="Your name"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="signup-email" className="text-sm font-medium">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <input
                  id="signup-email"
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
              <label htmlFor="signup-password" className="text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-14 w-full rounded-xl border border-input bg-card pl-12 pr-14 text-[15px] outline-none transition-colors focus:border-primary"
                  placeholder="At least 6 characters"
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

            {error ? (
              <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={pending}
              className="tap-target mt-1 flex h-14 items-center justify-center gap-2 rounded-xl bg-primary text-[16px] font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:-translate-y-0.5 disabled:opacity-70"
            >
              {pending ? (
                <Loader2 className="size-5 animate-spin" aria-hidden="true" />
              ) : (
                <>
                  Create account
                  <ArrowRight className="size-5" aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/" className="font-semibold text-primary hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </section>
    </div>
  )
}
