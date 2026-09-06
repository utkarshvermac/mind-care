import { cn } from "@/lib/utils"

export function Logo({ className, size = 40 }: { className?: string; size?: number }) {
  const gradientId = "mindcare-logo-gradient"

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[28%] text-primary-foreground shadow-lg shadow-primary/30",
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 40 40" width={size} height={size} className="absolute inset-0">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--accent)" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" fill={`url(#${gradientId})`} />
        <circle cx="10" cy="8" r="14" fill="white" opacity="0.06" />
      </svg>

      {/* A brain silhouette with a small bloom accent at the crown —
          memory (brain) and growth/wellness (bloom) in one mark. */}
      <svg
        viewBox="0 0 24 24"
        width={size * 0.56}
        height={size * 0.56}
        className="relative"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9.5 3.6c-2 .2-3.5 1.9-3.5 3.9 0 .5.1 1 .3 1.4-1.3.6-2.3 2-2.3 3.5 0 1.4.8 2.6 2 3.3-.1.3-.1.6-.1 1 0 2.2 1.8 4 4 4 .6 0 1.1-.1 1.6-.4" />
        <path d="M14.5 3.6c2 .2 3.5 1.9 3.5 3.9 0 .5-.1 1-.3 1.4 1.3.6 2.3 2 2.3 3.5 0 1.4-.8 2.6-2 3.3.1.3.1.6.1 1 0 2.2-1.8 4-4 4-.6 0-1.1-.1-1.6-.4" />
        <path d="M12 3.6v16.8" opacity="0.9" />
        <path d="M9.3 8.2c1 .5 1.7 1.4 1.7 2.6M14.7 8.2c-1 .5-1.7 1.4-1.7 2.6" opacity="0.65" />
        <circle cx="12" cy="2.4" r="1" fill="currentColor" stroke="none" />
      </svg>
    </span>
  )
}

export function LogoWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <Logo size={compact ? 36 : 42} />
      {!compact ? (
        <span className="flex flex-col leading-tight">
          <span className="font-display text-lg font-semibold tracking-tight">MindCare</span>
          <span className="text-xs text-muted-foreground">Memory &amp; cognitive wellness</span>
        </span>
      ) : null}
    </span>
  )
}
