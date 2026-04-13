"use client"

import {
  AlertTriangle,
  Bot,
  FileText,
  FolderOpen,
  LifeBuoy,
  MessageSquareText,
} from "lucide-react"
import { AdminGuard } from "@/components/screens/admin-guard"
import {
  AdminPageHeader,
  AdminRowLink,
  AdminTable,
  AdminTableCard,
  AdminTableCell,
  AdminTableHead,
  formatAdminDate,
} from "@/components/screens/admin-table-primitives"
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
      label: "Projects",
      value: adminDashboard.totalProjects,
      icon: FolderOpen,
      description: "Knowledge bases across the platform",
    },
    {
      label: "Documents",
      value: adminDashboard.totalDocuments,
      icon: FileText,
      description: "Uploaded files and notes",
    },
    {
      label: "AI chats",
      value: adminDashboard.totalAiChats,
      icon: Bot,
      description: "Student study conversations",
    },
    {
      label: "Support messages",
      value: adminDashboard.totalDeveloperMessages,
      icon: LifeBuoy,
      description: "Inbound product feedback",
    },
    {
      label: "Errors",
      value: adminDashboard.totalErrors,
      icon: AlertTriangle,
      description: "Operational issues needing attention",
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
            meta: `${state.systemErrors[0].severity.toUpperCase()} • ${state.systemErrors[0].route}`,
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
            meta: `${state.aiChats[0].messages.length} messages • AI study chat`,
            time: formatTimestamp(state.aiChats[0].updatedAt),
          },
        ]
      : []),
    {
      id: "dev",
      icon: LifeBuoy,
      iconClass: "text-orange-500",
      title: state.developerChat.title,
      meta: `${state.developerChat.messages.length} messages • Support thread`,
      time: formatTimestamp(state.developerChat.updatedAt),
    },
  ]

  const recentProjects = [...state.projects]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  const recentChats = [...state.aiChats]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  return (
    <AdminGuard>
      <div className="space-y-6">
        <AdminPageHeader
          title="Dashboard"
          description="High-signal business and operations info only."
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {stats.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <AdminTableCard>
            <div className="border-b px-4 py-3">
              <p className="text-sm font-semibold">Recent projects</p>
            </div>
            <AdminTable>
              <thead>
                <tr>
                  <AdminTableHead>Project</AdminTableHead>
                  <AdminTableHead>Documents</AdminTableHead>
                  <AdminTableHead>Updated</AdminTableHead>
                </tr>
              </thead>
              <tbody>
                {recentProjects.map((project) => {
                  const documentCount = state.documents.filter((doc) => doc.projectId === project.id).length

                  return (
                    <tr key={project.id} className="border-t border-border/70">
                      <AdminTableCell>
                        <AdminRowLink
                          href={`/admin/projects/${project.id}`}
                          primary={project.name}
                          secondary={`${project.courseCode} • ${project.description}`}
                        />
                      </AdminTableCell>
                      <AdminTableCell>{documentCount}</AdminTableCell>
                      <AdminTableCell>{formatAdminDate(project.updatedAt)}</AdminTableCell>
                    </tr>
                  )
                })}
              </tbody>
            </AdminTable>
          </AdminTableCard>

          <div className="rounded-2xl border bg-card p-4">
            <div className="mb-4 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Operational activity</p>
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

        <AdminTableCard>
          <div className="border-b px-4 py-3">
            <p className="text-sm font-semibold">Recent chats</p>
          </div>
          <AdminTable>
            <thead>
              <tr>
                <AdminTableHead>Chat</AdminTableHead>
                <AdminTableHead>Messages</AdminTableHead>
                <AdminTableHead>Updated</AdminTableHead>
              </tr>
            </thead>
            <tbody>
              {recentChats.map((chat) => (
                <tr key={chat.id} className="border-t border-border/70">
                  <AdminTableCell>
                    <AdminRowLink
                      href={`/admin/chats/${chat.id}`}
                      primary={chat.title}
                      secondary={chat.summary}
                    />
                  </AdminTableCell>
                  <AdminTableCell>{chat.messages.length}</AdminTableCell>
                  <AdminTableCell>{formatAdminDate(chat.updatedAt)}</AdminTableCell>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        </AdminTableCard>
      </div>
    </AdminGuard>
  )
}
