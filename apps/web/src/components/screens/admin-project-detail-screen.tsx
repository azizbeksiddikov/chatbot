"use client"

import Link from "next/link"
import { InfoStrip } from "@/components/glass"
import { useAppStore } from "@/components/providers/app-store-provider"
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

export function AdminProjectDetailScreen({ projectId }: { projectId: string }) {
  const { state } = useAppStore()
  const project = state.projects.find((entry) => entry.id === projectId)

  if (!project) {
    return (
      <AdminGuard>
        <div className="space-y-3">
          <Link href="/admin/projects" className="text-sm font-medium text-primary">
            Back to projects
          </Link>
          <AdminPageHeader title="Project not found" description="This project no longer exists in the mock data." />
        </div>
      </AdminGuard>
    )
  }

  const owner = state.users.find((user) => user.id === project.ownerUserId)
  const documents = state.documents.filter((document) => document.projectId === project.id)
  const chats = state.aiChats.filter((chat) => chat.projectIds.includes(project.id))

  return (
    <AdminGuard>
      <div className="space-y-6">
        <div className="space-y-3">
          <Link href="/admin/projects" className="text-sm font-medium text-primary">
            Back to projects
          </Link>
          <AdminPageHeader title={project.name} description={`${project.courseCode} • ${project.description}`} />
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <InfoStrip label="Owner" value={owner?.name ?? "Unknown"} detail={owner?.email} />
          <InfoStrip label="Documents" value={String(documents.length)} detail="Files and notes" />
          <InfoStrip label="Chats" value={String(chats.length)} detail="Linked conversations" />
          <InfoStrip label="Updated" value={formatAdminDate(project.updatedAt)} />
        </div>

        <AdminTableCard className="p-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Project summary</p>
            <p className="text-sm leading-6 text-muted-foreground">{project.description}</p>
          </div>
        </AdminTableCard>

        <AdminTableCard>
          <div className="border-b px-4 py-3">
            <p className="text-sm font-semibold">Documents</p>
          </div>
          <AdminTable>
            <thead>
              <tr>
                <AdminTableHead>Title</AdminTableHead>
                <AdminTableHead>Kind</AdminTableHead>
                <AdminTableHead>Status</AdminTableHead>
                <AdminTableHead>Chunks</AdminTableHead>
                <AdminTableHead>Updated</AdminTableHead>
              </tr>
            </thead>
            <tbody>
              {documents.length === 0 ? (
                <tr>
                  <AdminTableCell colSpan={5} className="py-8 text-muted-foreground">
                    No documents in this project.
                  </AdminTableCell>
                </tr>
              ) : (
                documents.map((document) => (
                  <tr key={document.id} className="border-t border-border/70">
                    <AdminTableCell>
                      <div>
                        <p className="font-medium">{document.title}</p>
                        {document.noteText ? <p className="mt-1 text-xs text-muted-foreground">{document.noteText}</p> : null}
                      </div>
                    </AdminTableCell>
                    <AdminTableCell className="uppercase">{document.kind}</AdminTableCell>
                    <AdminTableCell className="capitalize">{document.status}</AdminTableCell>
                    <AdminTableCell>{document.chunkCount ?? "-"}</AdminTableCell>
                    <AdminTableCell>{formatAdminDate(document.updatedAt)}</AdminTableCell>
                  </tr>
                ))
              )}
            </tbody>
          </AdminTable>
        </AdminTableCard>

        <AdminTableCard>
          <div className="border-b px-4 py-3">
            <p className="text-sm font-semibold">Chats</p>
          </div>
          <AdminTable>
            <thead>
              <tr>
                <AdminTableHead>Title</AdminTableHead>
                <AdminTableHead>Messages</AdminTableHead>
                <AdminTableHead>Created</AdminTableHead>
                <AdminTableHead>Updated</AdminTableHead>
              </tr>
            </thead>
            <tbody>
              {chats.length === 0 ? (
                <tr>
                  <AdminTableCell colSpan={4} className="py-8 text-muted-foreground">
                    No chats linked to this project.
                  </AdminTableCell>
                </tr>
              ) : (
                chats.map((chat) => (
                  <tr key={chat.id} className="border-t border-border/70">
                    <AdminTableCell>
                      <AdminRowLink
                        href={`/admin/chats/${chat.id}`}
                        primary={chat.title}
                        secondary={chat.summary}
                      />
                    </AdminTableCell>
                    <AdminTableCell>{chat.messages.length}</AdminTableCell>
                    <AdminTableCell>{formatAdminDate(chat.createdAt)}</AdminTableCell>
                    <AdminTableCell>{formatAdminDate(chat.updatedAt)}</AdminTableCell>
                  </tr>
                ))
              )}
            </tbody>
          </AdminTable>
        </AdminTableCard>
      </div>
    </AdminGuard>
  )
}
