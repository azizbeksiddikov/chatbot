"use client"

import type { TdHTMLAttributes, ThHTMLAttributes } from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { StatusBadge } from "@/components/glass"
import { cn, formatRelativeDate, formatTimestamp } from "@/lib/utils"

export function AdminPageHeader({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        Admin
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

export function AdminTableCard({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn("overflow-hidden rounded-2xl border bg-card", className)}>{children}</div>
}

export function AdminTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">{children}</table>
    </div>
  )
}

export function AdminTableHead({
  children,
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "bg-muted/45 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </th>
  )
}

export function AdminTableCell({
  children,
  className,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("px-4 py-3 align-top", className)} {...props}>
      {children}
    </td>
  )
}

export function AdminRowLink({
  href,
  primary,
  secondary,
}: {
  href: string
  primary: string
  secondary?: string
}) {
  return (
    <Link href={href} className="group inline-flex items-start gap-2">
      <span>
        <span className="block font-medium text-foreground group-hover:text-primary">{primary}</span>
        {secondary ? <span className="mt-0.5 block text-xs text-muted-foreground">{secondary}</span> : null}
      </span>
      <ChevronRight className="mt-0.5 size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  )
}

export function formatAdminDate(value: string) {
  return `${formatRelativeDate(value)} at ${formatTimestamp(value)}`
}

export function RoleBadge({ role }: { role: "student" | "admin" }) {
  return <StatusBadge label={role} tone={role === "admin" ? "developer" : "success"} />
}

export function ActivityDot({ color }: { color: string }) {
  return <span className="mt-1 inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
}
