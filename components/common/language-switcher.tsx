"use client"

import { Languages } from "lucide-react"
import { LANGUAGES, useTranslation } from "@/lib/i18n"
import { cn } from "@/lib/utils"

export function LanguageSwitcher({ variant = "light" }: { variant?: "light" | "dark" }) {
  const { language, setLanguage, t } = useTranslation()

  return (
    <label
      className={cn(
        "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium",
        variant === "dark"
          ? "border-primary-foreground/25 bg-primary-foreground/10 text-primary-foreground"
          : "border-border bg-card text-foreground",
      )}
    >
      <Languages className="size-4 shrink-0" aria-hidden="true" />
      <span className="sr-only">{t("common.language")}</span>
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as (typeof LANGUAGES)[number]["code"])}
        className={cn(
          "bg-transparent outline-none",
          variant === "dark" ? "text-primary-foreground [&>option]:text-foreground" : "text-foreground",
        )}
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.nativeLabel}
          </option>
        ))}
      </select>
    </label>
  )
}
