"use client"

import { useAppStore } from "@/components/providers/app-store-provider"
import { AdminGuard } from "@/components/screens/admin-guard"
import {
  ActivityDot,
  AdminPageHeader,
  AdminRowLink,
  AdminTable,
  AdminTableCard,
  AdminTableCell,
  AdminTableHead,
  formatAdminDate,
} from "@/components/screens/admin-table-primitives"

export function AdminChatsScreen() {
  const { state } = useAppStore()

  const rows = [...state.aiChats]
    .map((chat) => {
      const project = state.projects.find((entry) => entry.id === chat.projectIds[0])
      const owner = state.users.find((user) => user.id === project?.ownerUserId)

      return {
        chat,
        projectName: project?.name ?? "Unknown project",
        memberName: owner?.name ?? "Unknown member",
      }
    })
    .sort((a, b) => new Date(b.chat.updatedAt).getTime() - new Date(a.chat.updatedAt).getTime())

  return (
    <AdminGuard>
      <div className="space-y-6">
        <AdminPageHeader
          title="Chats"
          description={`${state.aiChats.length} AI chats in a compact admin table.`}
        />

        <AdminTableCard>
          <AdminTable>
            <thead>
              <tr>
                <AdminTableHead>Chat</AdminTableHead>
                <AdminTableHead>Project</AdminTableHead>
                <AdminTableHead>Member</AdminTableHead>
                <AdminTableHead>Messages</AdminTableHead>
                <AdminTableHead>Updated</AdminTableHead>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ chat, memberName, projectName }) => (
                <tr key={chat.id} className="border-t border-border/70">
                  <AdminTableCell>
                    <div className="flex items-start gap-3">
                      <ActivityDot color={chat.color} />
                      <AdminRowLink
                        href={`/admin/chats/${chat.id}`}
                        primary={chat.title}
                        secondary={chat.summary}
                      />
                    </div>
                  </AdminTableCell>
                  <AdminTableCell>{projectName}</AdminTableCell>
                  <AdminTableCell>{memberName}</AdminTableCell>
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
