import { cn } from "@/lib/utils"

export function Card({
  className,
  as: Tag = "div",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { as?: "div" | "section" | "article" | "li" }) {
  return <Tag className={cn("surface p-5 sm:p-6", className)} {...props} />
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("font-display text-lg font-semibold tracking-tight sm:text-xl", className)} {...props} />
}

export function CardSubtitle({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-1 text-sm text-muted-foreground", className)} {...props} />
}

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  )
}
