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

export function AdminProjectsScreen() {
  const { state } = useAppStore()

  const rows = [...state.projects]
    .map((project) => {
      const owner = state.users.find((user) => user.id === project.ownerUserId)
      const documents = state.documents.filter((document) => document.projectId === project.id)
      const chats = state.aiChats.filter((chat) => chat.projectIds.includes(project.id))

      return {
        project,
        ownerName: owner?.name ?? "Unknown member",
        documentsCount: documents.length,
        chatsCount: chats.length,
      }
    })
    .sort((a, b) => new Date(b.project.updatedAt).getTime() - new Date(a.project.updatedAt).getTime())

  return (
    <AdminGuard>
      <div className="space-y-6">
        <AdminPageHeader
          title="Projects"
          description={`${state.projects.length} projects in a compact admin table.`}
        />

        <AdminTableCard>
          <AdminTable>
            <thead>
              <tr>
                <AdminTableHead>Project</AdminTableHead>
                <AdminTableHead>Member</AdminTableHead>
                <AdminTableHead>Documents</AdminTableHead>
                <AdminTableHead>Chats</AdminTableHead>
                <AdminTableHead>Updated</AdminTableHead>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ project, ownerName, documentsCount, chatsCount }) => (
                <tr key={project.id} className="border-t border-border/70">
                  <AdminTableCell>
                    <div className="flex items-start gap-3">
                      <ActivityDot color={project.color} />
                      <AdminRowLink
                        href={`/admin/projects/${project.id}`}
                        primary={project.name}
                        secondary={`${project.courseCode} • ${project.description}`}
                      />
                    </div>
                  </AdminTableCell>
                  <AdminTableCell>{ownerName}</AdminTableCell>
                  <AdminTableCell>{documentsCount}</AdminTableCell>
                  <AdminTableCell>{chatsCount}</AdminTableCell>
                  <AdminTableCell>{formatAdminDate(project.updatedAt)}</AdminTableCell>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        </AdminTableCard>
      </div>
    </AdminGuard>
  )
}
