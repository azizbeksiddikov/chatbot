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
  RoleBadge,
  formatAdminDate,
} from "@/components/screens/admin-table-primitives"

export function AdminMemberDetailScreen({ memberId }: { memberId: string }) {
  const { state } = useAppStore()
  const member = state.users.find((entry) => entry.id === memberId)

  if (!member) {
    return (
      <AdminGuard>
        <div className="space-y-3">
          <Link href="/admin/members" className="text-sm font-medium text-primary">
            Back to members
          </Link>
          <AdminPageHeader title="Member not found" description="This member no longer exists in the mock data." />
        </div>
      </AdminGuard>
    )
  }

  const projects = state.projects.filter((project) => project.ownerUserId === member.id)
  const projectIds = new Set(projects.map((project) => project.id))
  const chats = state.aiChats.filter((chat) => chat.projectIds.some((id) => projectIds.has(id)))

  return (
    <AdminGuard>
      <div className="space-y-6">
        <div className="space-y-3">
          <Link href="/admin/members" className="text-sm font-medium text-primary">
            Back to members
          </Link>
          <AdminPageHeader title={member.name} description={`${member.email} • ${member.school}`} />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <InfoStrip label="Role" value={member.role} detail={member.status} />
          <InfoStrip label="Projects" value={String(projects.length)} detail="Owned knowledge bases" />
          <InfoStrip label="Chats" value={String(chats.length)} detail="Linked AI conversations" />
        </div>

        <AdminTableCard className="p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Profile</p>
              <div className="mt-3 space-y-2 text-sm">
                <p className="font-medium">{member.name}</p>
                <p className="text-muted-foreground">{member.email}</p>
                <p className="text-muted-foreground">{member.school}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Access</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <RoleBadge role={member.role} />
                <span className="rounded-full border px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {member.status}
                </span>
              </div>
            </div>
          </div>
        </AdminTableCard>

        <AdminTableCard>
          <div className="border-b px-4 py-3">
            <p className="text-sm font-semibold">Projects</p>
          </div>
          <AdminTable>
            <thead>
              <tr>
                <AdminTableHead>Name</AdminTableHead>
                <AdminTableHead>Course</AdminTableHead>
                <AdminTableHead>Documents</AdminTableHead>
                <AdminTableHead>Updated</AdminTableHead>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? (
                <tr>
                  <AdminTableCell colSpan={4} className="py-8 text-muted-foreground">
                    No projects yet.
                  </AdminTableCell>
                </tr>
              ) : (
                projects.map((project) => {
                  const documentCount = state.documents.filter((doc) => doc.projectId === project.id).length

                  return (
                    <tr key={project.id} className="border-t border-border/70">
                      <AdminTableCell>
                        <AdminRowLink
                          href={`/admin/projects/${project.id}`}
                          primary={project.name}
                          secondary={project.description}
                        />
                      </AdminTableCell>
                      <AdminTableCell>{project.courseCode}</AdminTableCell>
                      <AdminTableCell>{documentCount}</AdminTableCell>
                      <AdminTableCell>{formatAdminDate(project.updatedAt)}</AdminTableCell>
                    </tr>
                  )
                })
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
                <AdminTableHead>Project</AdminTableHead>
                <AdminTableHead>Messages</AdminTableHead>
                <AdminTableHead>Updated</AdminTableHead>
              </tr>
            </thead>
            <tbody>
              {chats.length === 0 ? (
                <tr>
                  <AdminTableCell colSpan={4} className="py-8 text-muted-foreground">
                    No chats yet.
                  </AdminTableCell>
                </tr>
              ) : (
                chats.map((chat) => {
                  const project = state.projects.find((entry) => entry.id === chat.projectIds[0])

                  return (
                    <tr key={chat.id} className="border-t border-border/70">
                      <AdminTableCell>
                        <AdminRowLink
                          href={`/admin/chats/${chat.id}`}
                          primary={chat.title}
                          secondary={chat.summary}
                        />
                      </AdminTableCell>
                      <AdminTableCell>{project?.name ?? "Unknown project"}</AdminTableCell>
                      <AdminTableCell>{chat.messages.length}</AdminTableCell>
                      <AdminTableCell>{formatAdminDate(chat.updatedAt)}</AdminTableCell>
                    </tr>
                  )
                })
              )}
            </tbody>
          </AdminTable>
        </AdminTableCard>
      </div>
    </AdminGuard>
  )
}
