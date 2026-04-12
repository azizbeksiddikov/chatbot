"use client"

import {
  AlertTriangle,
  Bot,
  FileText,
  FolderOpen,
  LifeBuoy,
  MessageSquareText,
  Users,
} from "lucide-react"
import { AdminGuard } from "@/components/screens/admin-guard"
import { useAppStore } from "@/components/providers/app-store-provider"
import { formatTimestamp } from "@/lib/utils"

function StatCard({
  label,
  value,
  icon: Icon,
  description,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  description: string
}) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-3.5 text-muted-foreground" />
        </div>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  )
}

export function AdminOverviewScreen() {
  const { adminDashboard, state } = useAppStore()

  const stats = [
    {
      label: "Users",
      value: adminDashboard.activeUsers,
      icon: Users,
      description: "Active demo accounts",
    },
    {
      label: "AI chats",
      value: adminDashboard.totalAiChats,
      icon: Bot,
      description: "Study conversations",
    },
    {
      label: "Support messages",
      value: adminDashboard.totalDeveloperMessages,
      icon: LifeBuoy,
      description: "Developer feedback thread",
    },
    {
      label: "Projects",
      value: adminDashboard.totalProjects,
      icon: FolderOpen,
      description: "Across all demo users",
    },
    {
      label: "Documents",
      value: adminDashboard.totalDocuments,
      icon: FileText,
      description: "Uploads and notes total",
    },
    {
      label: "Errors",
      value: adminDashboard.totalErrors,
      icon: AlertTriangle,
      description: "In the system error log",
    },
  ]

  const recentActivity = [
    ...(state.systemErrors[0]
      ? [
          {
            id: "err",
            icon: AlertTriangle,
            iconClass: "text-rose-500",
            title: state.systemErrors[0].title,
            meta: `${state.systemErrors[0].severity.toUpperCase()} · ${state.systemErrors[0].route}`,
            time: formatTimestamp(state.systemErrors[0].createdAt),
          },
        ]
      : []),
    ...(state.aiChats[0]
      ? [
          {
            id: "chat",
            icon: Bot,
            iconClass: "text-sky-500",
            title: state.aiChats[0].title,
            meta: `${state.aiChats[0].messages.length} messages · AI study chat`,
            time: formatTimestamp(state.aiChats[0].updatedAt),
          },
        ]
      : []),
    {
      id: "dev",
      icon: LifeBuoy,
      iconClass: "text-orange-500",
      title: state.developerChat.title,
      meta: `${state.developerChat.messages.length} messages · Support thread`,
      time: formatTimestamp(state.developerChat.updatedAt),
    },
  ]

  return (
    <AdminGuard>
      <div className="space-y-6">
        {/* Page header */}
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Admin
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            System health and activity at a glance.
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {stats.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Users snapshot */}
          <div className="rounded-2xl border bg-card p-4">
            <div className="mb-4 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Users</p>
              <span className="text-xs text-muted-foreground">{state.users.length} total</span>
            </div>
            <div className="space-y-2">
              {state.users.map((user) => (
                <div key={user.id} className="flex items-center gap-3 rounded-xl border bg-muted/30 px-3 py-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                    {user.avatarLabel}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span
                      className={[
                        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                        user.role === "admin"
                          ? "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                          : "bg-muted text-muted-foreground",
                      ].join(" ")}
                    >
                      {user.role}
                    </span>
                    <span
                      className={[
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                        user.status === "active"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-muted-foreground",
                      ].join(" ")}
                    >
                      {user.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity feed */}
          <div className="rounded-2xl border bg-card p-4">
            <div className="mb-4 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Recent activity</p>
              <MessageSquareText className="size-4 text-muted-foreground" />
            </div>
            <div className="space-y-3">
              {recentActivity.map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.id} className="flex items-start gap-3 rounded-xl border bg-muted/30 px-3 py-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Icon className={`size-3.5 ${item.iconClass}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug">{item.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.meta}</p>
                    </div>
                    <p className="shrink-0 text-xs text-muted-foreground">{item.time}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </AdminGuard>
  )
}
