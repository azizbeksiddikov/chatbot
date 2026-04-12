import type { HTMLAttributes, ReactNode } from "react"
import { cn } from "@/lib/utils"

export function GlassPanel({
  className,
  tone = "default",
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  tone?: "default" | "strong" | "soft" | "developer" | "solid"
}) {
  return (
    <div
      className={cn(
        "glass-panel rounded-[30px] border border-white/25 p-4 sm:p-5",
        tone === "strong" && "glass-panel-strong",
        tone === "soft" && "glass-panel-soft",
        tone === "developer" && "glass-panel-developer",
        tone === "solid" && "glass-panel-solid",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function SectionTitle({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        {eyebrow ? (
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-foreground/50">
            {eyebrow}
          </p>
        ) : null}
        <div className="space-y-1">
          <h1 className="font-heading text-[2.1rem] leading-[0.98] tracking-tight text-foreground sm:text-[2.6rem]">
            {title}
          </h1>
          {description ? (
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}

export function StatusBadge({
  label,
  tone = "neutral",
}: {
  label: string
  tone?: "neutral" | "success" | "warning" | "danger" | "developer"
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.2em]",
        tone === "neutral" &&
          "border-white/30 bg-white/52 text-foreground/78 dark:bg-white/7 dark:text-foreground/72",
        tone === "success" &&
          "border-emerald-500/28 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
        tone === "warning" &&
          "border-amber-500/28 bg-amber-500/12 text-amber-700 dark:text-amber-300",
        tone === "danger" &&
          "border-rose-500/28 bg-rose-500/12 text-rose-700 dark:text-rose-300",
        tone === "developer" &&
          "border-orange-500/28 bg-orange-500/12 text-orange-700 dark:text-orange-300",
      )}
    >
      {label}
    </span>
  )
}

export function MetricCard({
  label,
  value,
  detail,
  accent,
}: {
  label: string
  value: string
  detail: string
  accent?: string
}) {
  return (
    <GlassPanel tone="soft" className="space-y-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-foreground/52">
          {label}
        </p>
        <span
          className="h-2.5 w-2.5 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.95),rgba(255,255,255,0.18))] shadow-[0_0_0_6px_rgba(255,255,255,0.14)]"
          style={accent ? { backgroundColor: accent } : undefined}
        />
      </div>
      <div className="space-y-1">
        <p className="font-heading text-[2rem] leading-none text-foreground">{value}</p>
        <p className="text-sm leading-5 text-muted-foreground">{detail}</p>
      </div>
    </GlassPanel>
  )
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string
  description: string
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <GlassPanel tone="soft" className="flex flex-col items-start gap-5 p-6 sm:p-7">
      {icon ? (
        <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-white/58 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:bg-white/8 dark:shadow-none">
          {icon}
        </div>
      ) : null}
      <div className="space-y-2">
        <h2 className="font-heading text-2xl text-foreground sm:text-[2rem]">{title}</h2>
        <p className="max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {action}
    </GlassPanel>
  )
}

export function InfoStrip({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail?: string
}) {
  return (
    <div className="rounded-[22px] border border-white/20 bg-white/40 px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] dark:bg-white/7 dark:shadow-none">
      <p className="text-[0.66rem] font-semibold uppercase tracking-[0.26em] text-foreground/48">
        {label}
      </p>
      <p className="mt-1 text-base font-medium text-foreground">{value}</p>
      {detail ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p> : null}
    </div>
  )
}
