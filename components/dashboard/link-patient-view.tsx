"use client"

import { useState } from "react"
import { ArrowRight, HeartHandshake, Loader2 } from "lucide-react"
import { Card } from "@/components/common/card"
import { linkPatient, ApiError } from "@/lib/api"
import { useTranslation } from "@/lib/i18n"

export function LinkPatientView({ onLinked }: { onLinked: () => void }) {
  const { t } = useTranslation()
  const [code, setCode] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    if (!code.trim()) {
      setError("Please enter an invite code.")
      return
    }
    setPending(true)
    try {
      await linkPatient(code.trim())
      onLinked()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("auth.serverUnreachable"))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <HeartHandshake className="size-8" />
        </span>
        <h2 className="mt-4 font-display text-xl font-semibold tracking-tight">{t("link.headline")}</h2>
        <p className="mt-2 text-sm text-muted-foreground text-pretty">{t("link.subtext")}</p>

        <form className="mt-6 flex flex-col gap-3" onSubmit={submit}>
          <label htmlFor="invite-code" className="sr-only">
            {t("link.codeLabel")}
          </label>
          <input
            id="invite-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder={t("link.codePlaceholder")}
            className="h-14 w-full rounded-xl border border-input bg-card px-4 text-center font-display text-xl font-semibold tracking-[0.3em] outline-none transition-colors focus:border-primary"
            maxLength={8}
          />

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
            {pending ? (
              <Loader2 className="size-5 animate-spin" aria-hidden="true" />
            ) : (
              <>
                {t("link.linkButton")}
                <ArrowRight className="size-5" aria-hidden="true" />
              </>
            )}
          </button>
        </form>
      </Card>
    </div>
  )
}
