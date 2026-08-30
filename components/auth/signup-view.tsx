"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Eye, EyeOff, Lock, Loader2, Mail, ShieldCheck, User } from "lucide-react"
import { useApp } from "@/components/app-provider"
import { Logo } from "@/components/common/logo"
import { RoleSelector } from "@/components/auth/role-selector"
import { LanguageSwitcher } from "@/components/common/language-switcher"
import { signupUser, updatePreferencesRemote, ApiError } from "@/lib/api"
import { useTranslation } from "@/lib/i18n"
import type { Role } from "@/lib/mock-data"

export function SignupView() {
  const router = useRouter()
  const { login, role, ready } = useApp()
  const { t } = useTranslation()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role>("patient")
  const [consent, setConsent] = useState(true)
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
    if (password !== confirmPassword) {
      setError("Passwords don't match.")
      return
    }

    setPending(true)
    try {
      const data = await signupUser({ name: name.trim(), email, password, role: selectedRole })
      if (selectedRole === "patient") {
        // Best-effort — the account already exists either way, so a failed
        // preference write shouldn't block onboarding.
        void updatePreferencesRemote({ shareWithCaregiver: consent }).catch(() => {})
      }
      login(data.role, data.user.name)
      router.push("/dashboard")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("auth.serverUnreachable"))
      setPending(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Brand panel */}
      <section className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-primary via-primary to-accent px-6 py-10 text-primary-foreground sm:px-10 lg:w-[46%] lg:py-14">
        <div className="pointer-events-none absolute -right-24 top-10 size-72 rounded-full bg-primary-foreground/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 size-64 rounded-full bg-secondary/25 blur-3xl" />

        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Logo size={48} className="bg-primary-foreground/15 shadow-none" />
            <span className="flex flex-col leading-tight">
              <span className="font-display text-xl font-semibold tracking-tight">MindCare</span>
              <span className="text-sm text-primary-foreground/75">{t("brand.tagline")}</span>
            </span>
          </div>
          <LanguageSwitcher variant="dark" />
        </div>

        <div className="relative mt-10 max-w-md lg:mt-0">
          <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight text-balance sm:text-4xl">
            {t("auth.signupHeadline")}
          </h1>
          <p className="mt-4 text-primary-foreground/85 text-pretty">{t("auth.signupSubtext")}</p>
        </div>

        <p className="relative mt-10 flex items-center gap-2 text-sm text-primary-foreground/70">
          <ShieldCheck className="size-4" aria-hidden="true" />
          Your password is stored securely — never in plain text.
        </p>
      </section>

      {/* Form panel */}
      <section className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{t("auth.createYourAccount")}</h2>
          <p className="mt-2 text-muted-foreground">{t("auth.tellUsAboutYou")}</p>

          <div className="mt-6">
            <p className="mb-2 text-sm font-medium">{t("auth.iAmA")}</p>
            <RoleSelector value={selectedRole} onChange={setSelectedRole} />
          </div>

          <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <label htmlFor="name" className="text-sm font-medium">
                {t("auth.fullName")}
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-14 w-full rounded-xl border border-input bg-card pl-12 pr-4 text-[15px] outline-none transition-colors focus:border-primary"
                  placeholder={t("auth.namePlaceholder")}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="signup-email" className="text-sm font-medium">
                {t("auth.email")}
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-14 w-full rounded-xl border border-input bg-card pl-12 pr-4 text-[15px] outline-none transition-colors focus:border-primary"
                  placeholder={t("auth.emailPlaceholder")}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label htmlFor="signup-password" className="text-sm font-medium">
                  {t("auth.password")}
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-14 w-full rounded-xl border border-input bg-card pl-12 pr-12 text-[15px] outline-none transition-colors focus:border-primary"
                    placeholder={t("auth.passwordHint")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                    className="absolute right-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="confirm-password" className="text-sm font-medium">
                  {t("auth.confirmPassword")}
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-14 w-full rounded-xl border border-input bg-card pl-12 pr-4 text-[15px] outline-none transition-colors focus:border-primary"
                    placeholder={t("auth.passwordHint")}
                  />
                </div>
              </div>
            </div>

            {selectedRole === "patient" ? (
              <label className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1 size-5 shrink-0 rounded border-input text-primary focus:ring-primary"
                />
                <span>
                  <span className="block text-sm font-medium">{t("auth.consentLabel")}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{t("auth.consentHint")}</span>
                </span>
              </label>
            ) : null}

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
                  {t("auth.createAccountButton")}
                  <ArrowRight className="size-5" aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t("auth.alreadyHaveAccount")}{" "}
            <Link href="/" className="font-semibold text-primary hover:underline">
              {t("auth.logInLink")}
            </Link>
          </p>
        </div>
      </section>
    </div>
  )
}
