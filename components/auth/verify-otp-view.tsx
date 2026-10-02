"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Loader2, MailCheck } from "lucide-react"
import { useApp } from "@/components/app-provider"
import { Logo } from "@/components/common/logo"
import { verifyOtp, resendOtp, updatePreferencesRemote, ApiError } from "@/lib/api"
import { useTranslation } from "@/lib/i18n"

export function VerifyOtpView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useApp()
  const { t, language } = useTranslation()

  const email = searchParams.get("email") ?? ""
  const role = searchParams.get("role")
  const consentParam = searchParams.get("consent")

  const [code, setCode] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const [devOtp, setDevOtp] = useState<string | null>(searchParams.get("devOtp"))
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => clearInterval(id)
  }, [cooldown])

  const pushChosenPreferences = async () => {
    // Best-effort, awaited before login() below — mirrors the same
    // sequencing used right after signup, so AppProvider's own preferences
    // fetch (triggered by login()) can't race ahead of this write.
    await updatePreferencesRemote({
      language,
      ...(role === "patient" && consentParam !== null ? { shareWithCaregiver: consentParam === "true" } : {}),
    }).catch(() => {})
  }

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!/^\d{6}$/.test(code)) {
      setError(t("auth.verifyCodeRequired"))
      return
    }

    setPending(true)
    try {
      const data = await verifyOtp(email, code)
      await pushChosenPreferences()
      login(data.role, data.user.name)
      router.push("/dashboard")
    } catch (err) {
      if (err instanceof ApiError && err.details?.code === "ALREADY_VERIFIED") {
        // Can happen with a double-submit or a stale link after verifying
        // elsewhere — the account is fine, they just need to log in with
        // their password (this endpoint never issues a token by itself).
        router.push("/")
        return
      }
      setError(err instanceof ApiError ? err.message : t("auth.serverUnreachable"))
      setPending(false)
    }
  }

  const handleResend = async () => {
    if (cooldown > 0) return
    setError(null)
    setResendMessage(null)
    setResending(true)
    try {
      const data = await resendOtp(email)
      setResendMessage(t("auth.resendSuccess"))
      setDevOtp(data.devOtp ?? null)
      setCooldown(60)
    } catch (err) {
      if (err instanceof ApiError && err.details?.code === "OTP_COOLDOWN") {
        const retryAfter = err.details.retryAfterSeconds
        setCooldown(typeof retryAfter === "number" ? retryAfter : 60)
      }
      setError(err instanceof ApiError ? err.message : t("auth.serverUnreachable"))
    } finally {
      setResending(false)
    }
  }

  if (!email) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4 py-10">
        <div className="w-full max-w-md text-center">
          <p className="text-muted-foreground">{t("auth.verifyMissingEmail")}</p>
          <Link href="/signup" className="mt-4 inline-flex items-center gap-1.5 font-semibold text-primary hover:underline">
            <ArrowLeft className="size-4" aria-hidden="true" />
            {t("auth.backToSignup")}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <Logo size={44} />
          <span className="font-display text-lg font-semibold tracking-tight">MindCare</span>
        </div>

        <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <MailCheck className="size-6" aria-hidden="true" />
        </span>

        <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight sm:text-3xl">{t("auth.verifyHeadline")}</h1>
        <p className="mt-2 text-muted-foreground">
          {t("auth.verifySubtextBefore")} <span className="font-medium text-foreground">{email}</span>.{" "}
          {t("auth.verifySubtextAfter")}
        </p>

        {devOtp ? (
          <div className="mt-4 rounded-xl border border-warning/30 bg-warning/8 p-4 text-sm">
            <p className="font-medium text-warning">{t("auth.devNoteToken")}</p>
            <p className="mt-2 text-center text-2xl font-bold tracking-[0.4em] text-foreground">{devOtp}</p>
          </div>
        ) : null}

        <form className="mt-6 flex flex-col gap-4" onSubmit={handleVerify}>
          <div className="flex flex-col gap-2">
            <label htmlFor="otp-code" className="text-sm font-medium">
              {t("auth.verifyCodeLabel")}
            </label>
            <input
              id="otp-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="h-16 w-full rounded-xl border border-input bg-card px-4 text-center text-2xl font-semibold tracking-[0.5em] outline-none transition-colors focus:border-primary"
              placeholder="000000"
            />
          </div>

          {error ? (
            <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          {resendMessage ? (
            <p className="rounded-xl bg-success/8 px-4 py-3 text-sm text-success">{resendMessage}</p>
          ) : null}

          <button
            type="submit"
            disabled={pending || code.length !== 6}
            className="tap-target flex h-14 items-center justify-center gap-2 rounded-xl bg-primary text-[16px] font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:-translate-y-0.5 disabled:opacity-70"
          >
            {pending ? (
              <Loader2 className="size-5 animate-spin" aria-hidden="true" />
            ) : (
              <>
                {t("auth.verifyButton")}
                <ArrowRight className="size-5" aria-hidden="true" />
              </>
            )}
          </button>
        </form>

        <button
          type="button"
          onClick={handleResend}
          disabled={resending || cooldown > 0}
          className="tap-target mt-4 flex h-11 w-full items-center justify-center text-sm font-semibold text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
        >
          {resending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : cooldown > 0 ? (
            `${t("auth.resendCode")} (${cooldown}s)`
          ) : (
            t("auth.resendCode")
          )}
        </button>

        <Link
          href="/"
          className="mt-2 flex items-center justify-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t("auth.backToLogin")}
        </Link>
      </div>
    </div>
  )
}
