import { cn } from "@/lib/utils"

export function Logo({ className, size = 40 }: { className?: string; size?: number }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg shadow-primary/25",
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" width={size * 0.58} height={size * 0.58} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20.5c-3.6-2.4-6.5-4.9-6.5-8.7A3.8 3.8 0 0 1 12 9.3a3.8 3.8 0 0 1 6.5 2.5c0 3.8-2.9 6.3-6.5 8.7Z" />
        <path d="M9.2 7.1A2.6 2.6 0 0 1 12 3.5a2.6 2.6 0 0 1 2.8 3.6" />
        <path d="M12 9.3V6" />
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
          <span className="text-xs text-muted-foreground">Memory & cognitive wellness</span>
        </span>
      ) : null}
    </span>
  )
}
