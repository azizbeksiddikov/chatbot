"use client"

import Link from "next/link"
import { InfoStrip } from "@/components/glass"
import { useAppStore } from "@/components/providers/app-store-provider"
import { AdminGuard } from "@/components/screens/admin-guard"
import { AdminPageHeader, formatAdminDate } from "@/components/screens/admin-table-primitives"

export function AdminChatDetailScreen({ chatId }: { chatId: string }) {
  const { state } = useAppStore()
  const chat = state.aiChats.find((entry) => entry.id === chatId)

  if (!chat) {
    return (
      <AdminGuard>
        <div className="space-y-3">
          <Link href="/admin/chats" className="text-sm font-medium text-primary">
            Back to chats
          </Link>
          <AdminPageHeader title="Chat not found" description="This chat no longer exists in the mock data." />
        </div>
      </AdminGuard>
    )
  }

  const project = state.projects.find((entry) => entry.id === chat.projectIds[0])
  const member = state.users.find((user) => user.id === project?.ownerUserId)

  return (
    <AdminGuard>
      <div className="space-y-6">
        <div className="space-y-3">
          <Link href="/admin/chats" className="text-sm font-medium text-primary">
            Back to chats
          </Link>
          <AdminPageHeader title={chat.title} description={chat.summary} />
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <InfoStrip label="Member" value={member?.name ?? "Unknown"} detail={member?.email} />
          <InfoStrip label="Project" value={project?.name ?? "Unknown"} detail={project?.courseCode} />
          <InfoStrip label="Messages" value={String(chat.messages.length)} detail="Full transcript below" />
          <InfoStrip label="Updated" value={formatAdminDate(chat.updatedAt)} />
        </div>

        <div className="space-y-3 rounded-2xl border bg-card p-4 sm:p-5">
          <p className="text-sm font-semibold">Transcript</p>
          {chat.messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">This chat has no messages yet.</p>
          ) : (
            chat.messages.map((message) => (
              <div key={message.id} className="rounded-2xl border bg-muted/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium capitalize">{message.role}</p>
                  <p className="text-xs text-muted-foreground">{formatAdminDate(message.createdAt)}</p>
                </div>
                <p className="mt-3 text-sm leading-6 text-foreground">{message.content}</p>
                {message.citations.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.citations.map((citation) => (
                      <span
                        key={citation.id}
                        className="rounded-full border bg-card px-2.5 py-1 text-xs text-muted-foreground"
                      >
                        {citation.label}
                        {citation.location ? ` • ${citation.location}` : ""}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </AdminGuard>
  )
}
