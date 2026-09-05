"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Loader2, Mail } from "lucide-react"
import { Logo } from "@/components/common/logo"
import { requestPasswordReset, ApiError } from "@/lib/api"
import { useTranslation } from "@/lib/i18n"

export function ForgotPasswordView() {
  const { t } = useTranslation()
  const [email, setEmail] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [devToken, setDevToken] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setPending(true)
    try {
      const data = await requestPasswordReset(email)
      setSent(true)
      if (data.devResetToken) setDevToken(data.devResetToken)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("auth.serverUnreachable"))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <Logo size={44} />
          <span className="font-display text-lg font-semibold tracking-tight">MindCare</span>
        </div>

        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{t("auth.forgotHeadline")}</h1>
        <p className="mt-2 text-muted-foreground">{t("auth.forgotSubtext")}</p>

        {sent ? (
          <div className="mt-6 flex flex-col gap-4">
            <div className="rounded-xl border border-success/30 bg-success/8 px-4 py-3 text-sm text-success">
              If that email has an account, a reset link has been created.
            </div>
            {devToken ? (
              <div className="rounded-xl border border-warning/30 bg-warning/8 p-4 text-sm">
                <p className="font-medium text-warning">{t("auth.devNoteToken")}</p>
                <Link
                  href={`/reset-password?token=${devToken}`}
                  className="mt-2 inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
                >
                  Continue to reset password
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            ) : null}
          </div>
        ) : (
          <form className="mt-6 flex flex-col gap-4" onSubmit={submit}>
            <div className="flex flex-col gap-2">
              <label htmlFor="forgot-email" className="text-sm font-medium">
                {t("auth.email")}
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <input
                  id="forgot-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-14 w-full rounded-xl border border-input bg-card pl-12 pr-4 text-[15px] outline-none transition-colors focus:border-primary"
                  placeholder={t("auth.emailPlaceholder")}
                />
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
              className="tap-target flex h-14 items-center justify-center gap-2 rounded-xl bg-primary text-[16px] font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:-translate-y-0.5 disabled:opacity-70"
            >
              {pending ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : t("auth.sendResetLink")}
            </button>
          </form>
        )}

        <Link href="/" className="mt-6 flex items-center justify-center gap-1.5 text-sm font-semibold text-primary hover:underline">
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t("auth.backToLogin")}
        </Link>
      </div>
    </div>
  )
}
