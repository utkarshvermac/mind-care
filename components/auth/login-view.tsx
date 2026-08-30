"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from "lucide-react"
import { useApp } from "@/components/app-provider"
import { Logo } from "@/components/common/logo"
import { loginWithPassword, ApiError } from "@/lib/api"
import { useTranslation } from "@/lib/i18n"
import { LanguageSwitcher } from "@/components/common/language-switcher"

export function LoginView() {
  const router = useRouter()
  const { login, role, ready } = useApp()
  const { t } = useTranslation()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (ready && role) router.replace("/dashboard")
  }, [ready, role, router])

  const submitForm = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setPending(true)
    try {
      const data = await loginWithPassword(email, password)
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
            {t("auth.loginHeadline")}
          </h1>
          <p className="mt-4 text-primary-foreground/85 text-pretty">{t("auth.loginSubtext")}</p>
        </div>

        <p className="relative mt-10 flex items-center gap-2 text-sm text-primary-foreground/70">
          <ShieldCheck className="size-4" aria-hidden="true" />
          {t("auth.securityNote")}
        </p>
      </section>

      {/* Form panel */}
      <section className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{t("auth.welcomeBack")}</h2>
              <p className="mt-2 text-muted-foreground">{t("auth.loginPrompt")}</p>
            </div>
          </div>

          {/* Primary action: create account — deliberately placed high up, not
              buried at the bottom, so new users don't miss it. */}
          <Link
            href="/signup"
            className="tap-target mt-5 flex h-14 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/40 px-6 font-semibold text-primary transition-colors hover:border-primary hover:bg-primary/5"
          >
            {t("auth.newHereCreate")}
          </Link>

          <div className="my-6 flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            {t("auth.orLogIn")}
            <span className="h-px flex-1 bg-border" />
          </div>

          <form className="flex flex-col gap-4" onSubmit={submitForm}>
            <div className="flex flex-col gap-2">
              <label htmlFor="login-email" className="text-sm font-medium">
                {t("auth.email")}
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <input
                  id="login-email"
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

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label htmlFor="login-password" className="text-sm font-medium">
                  {t("auth.password")}
                </label>
                <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                  {t("auth.forgotPassword")}
                </Link>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-14 w-full rounded-xl border border-input bg-card pl-12 pr-14 text-[15px] outline-none transition-colors focus:border-primary"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
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
                  {t("auth.logIn")}
                  <ArrowRight className="size-5" aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t("auth.newHereQuestion")}{" "}
            <Link href="/signup" className="font-semibold text-primary hover:underline">
              {t("auth.createAccount")}
            </Link>
          </p>
        </div>
      </section>
    </div>
  )
}
