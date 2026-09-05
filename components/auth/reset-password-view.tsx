"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowRight, Eye, EyeOff, Loader2, Lock } from "lucide-react"
import { Logo } from "@/components/common/logo"
import { resetPassword, ApiError } from "@/lib/api"
import { useTranslation } from "@/lib/i18n"

export function ResetPasswordView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useTranslation()
  const token = searchParams.get("token") ?? ""

  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!token) {
      setError("This reset link is missing its token. Please request a new one.")
      return
    }
    if (password.length < 6) {
      setError("Password should be at least 6 characters.")
      return
    }

    setPending(true)
    try {
      await resetPassword(token, password)
      setDone(true)
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

        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{t("auth.resetHeadline")}</h1>

        {done ? (
          <div className="mt-6 flex flex-col gap-4">
            <div className="rounded-xl border border-success/30 bg-success/8 px-4 py-3 text-sm text-success">
              Password updated. You can now log in with your new password.
            </div>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="tap-target flex h-14 items-center justify-center gap-2 rounded-xl bg-primary text-[16px] font-semibold text-primary-foreground shadow-lg shadow-primary/25"
            >
              {t("auth.backToLogin")}
              <ArrowRight className="size-5" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <form className="mt-6 flex flex-col gap-4" onSubmit={submit}>
            <div className="flex flex-col gap-2">
              <label htmlFor="new-password" className="text-sm font-medium">
                {t("auth.newPassword")}
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-14 w-full rounded-xl border border-input bg-card pl-12 pr-14 text-[15px] outline-none transition-colors focus:border-primary"
                  placeholder={t("auth.passwordHint")}
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
              className="tap-target flex h-14 items-center justify-center gap-2 rounded-xl bg-primary text-[16px] font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:-translate-y-0.5 disabled:opacity-70"
            >
              {pending ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : t("auth.updatePassword")}
            </button>
          </form>
        )}

        <Link href="/" className="mt-6 flex items-center justify-center text-sm font-semibold text-primary hover:underline">
          {t("auth.backToLogin")}
        </Link>
      </div>
    </div>
  )
}
