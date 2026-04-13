"use client"

import { useState } from "react"
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react"
import { AdminGuard } from "@/components/screens/admin-guard"
import { AdminPageHeader } from "@/components/screens/admin-table-primitives"
import { useAppStore } from "@/components/providers/app-store-provider"
import { formatTimestamp } from "@/lib/utils"
import type { SystemErrorSeverity, SystemErrorStatus } from "@/lib/mock-types"

function SeverityIcon({ severity }: { severity: SystemErrorSeverity }) {
  if (severity === "critical") return <AlertCircle className="size-4 text-rose-500" />
  if (severity === "warn") return <AlertTriangle className="size-4 text-amber-500" />
  return <Info className="size-4 text-sky-500" />
}

function severityStyle(severity: SystemErrorSeverity) {
  if (severity === "critical") return "bg-rose-500/10 text-rose-600 dark:text-rose-400"
  if (severity === "warn") return "bg-amber-500/10 text-amber-600 dark:text-amber-400"
  return "bg-sky-500/10 text-sky-600 dark:text-sky-400"
}

function severityText(severity: SystemErrorSeverity) {
  if (severity === "critical") return "Critical"
  if (severity === "warn") return "Warning"
  return "Info"
}

function statusStyle(status: SystemErrorStatus) {
  return status === "open"
    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
}

export function AdminErrorsScreen() {
  const { state } = useAppStore()
  const [severityFilter, setSeverityFilter] = useState<"all" | SystemErrorSeverity>("all")
  const [statusFilter, setStatusFilter] = useState<"all" | SystemErrorStatus>("all")
  const [expanded, setExpanded] = useState<string | null>(null)

  const filtered = state.systemErrors.filter((err) => {
    const matchSeverity = severityFilter === "all" || err.severity === severityFilter
    const matchStatus = statusFilter === "all" || err.status === statusFilter
    return matchSeverity && matchStatus
  })

  const openCount = state.systemErrors.filter((entry) => entry.status === "open").length
  const criticalCount = state.systemErrors.filter((entry) => entry.severity === "critical").length

  return (
    <AdminGuard>
      <div className="space-y-6">
        <div>
          <AdminPageHeader title="Errors" description="System errors with quick filters and expandable detail." />
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full border bg-card px-2.5 py-1 text-xs text-muted-foreground">
              {state.systemErrors.length} total
            </span>
            {openCount > 0 ? (
              <span className="rounded-full border bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                {openCount} open
              </span>
            ) : null}
            {criticalCount > 0 ? (
              <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                {criticalCount} critical
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="flex flex-wrap gap-1.5">
            {(["all", "critical", "warn", "info"] as const).map((severity) => (
              <button
                key={severity}
                type="button"
                onClick={() => setSeverityFilter(severity)}
                className={[
                  "rounded-xl border px-2.5 py-1.5 text-xs font-medium capitalize transition-colors",
                  severityFilter === severity
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:bg-muted",
                ].join(" ")}
              >
                {severity === "all" ? "All severity" : severity}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(["all", "open", "resolved"] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={[
                  "rounded-xl border px-2.5 py-1.5 text-xs font-medium capitalize transition-colors",
                  statusFilter === status
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:bg-muted",
                ].join(" ")}
              >
                {status === "all" ? "All status" : status}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-12 text-center">
              <CheckCircle2 className="size-7 text-emerald-500" />
              <p className="mt-3 text-sm font-medium">No errors match the filter</p>
            </div>
          ) : (
            filtered.map((error) => {
              const isExpanded = expanded === error.id

              return (
                <div key={error.id} className="rounded-2xl border bg-card">
                  <button
                    type="button"
                    className="flex w-full items-start gap-3 p-4 text-left"
                    onClick={() => setExpanded(isExpanded ? null : error.id)}
                  >
                    <div className="mt-0.5 shrink-0">
                      <SeverityIcon severity={error.severity} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="text-sm font-medium">{error.title}</p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${severityStyle(error.severity)}`}
                        >
                          {severityText(error.severity)}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusStyle(error.status)}`}
                        >
                          {error.status}
                        </span>
                      </div>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">{error.route}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{formatTimestamp(error.createdAt)}</p>
                    </div>

                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                      {isExpanded ? "Hide" : "View"}
                    </span>
                  </button>

                  {isExpanded ? (
                    <div className="border-t bg-muted/30 px-4 pb-4 pt-3">
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Detail
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{error.detail}</p>
                    </div>
                  ) : null}
                </div>
              )
            })
          )}
        </div>
      </div>
    </AdminGuard>
  )
}
