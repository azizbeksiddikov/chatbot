"use client"

import { useMemo, useState } from "react"
import { ArrowDownAZ, ArrowUpAZ, ArrowUpDown, Search } from "lucide-react"
import { AdminGuard } from "@/components/screens/admin-guard"
import {
  AdminPageHeader,
  AdminRowLink,
  AdminTableCard,
  RoleBadge,
} from "@/components/screens/admin-table-primitives"
import { useAppStore } from "@/components/providers/app-store-provider"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

type MemberSortKey = "name" | "role" | "projects" | "chats"

function SortButton({
  label,
  column,
  active,
  direction,
  onToggle,
}: {
  label: string
  column: MemberSortKey
  active: boolean
  direction: "asc" | "desc"
  onToggle: (column: MemberSortKey) => void
}) {
  const Icon = !active ? ArrowUpDown : direction === "asc" ? ArrowUpAZ : ArrowDownAZ

  return (
    <button
      type="button"
      onClick={() => onToggle(column)}
      className={cn(
        "inline-flex items-center gap-1 transition-colors",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <span>{label}</span>
      <Icon className="size-3.5" />
    </button>
  )
}

export function AdminMembersScreen() {
  const { state } = useAppStore()
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<"all" | "student" | "admin">("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
  const [sortKey, setSortKey] = useState<MemberSortKey>("name")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  const rows = useMemo(() => {
    return state.users
      .map((user) => {
        const projects = state.projects.filter((project) => project.ownerUserId === user.id)
        const projectIds = new Set(projects.map((project) => project.id))
        const chats = state.aiChats.filter((chat) => chat.projectIds.some((projectId) => projectIds.has(projectId)))

        return { user, projectsCount: projects.length, chatsCount: chats.length }
      })
      .filter(({ user }) => {
        const query = search.trim().toLowerCase()
        const matchesQuery =
          !query ||
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          user.school.toLowerCase().includes(query)
        const matchesRole = roleFilter === "all" || user.role === roleFilter
        const matchesStatus = statusFilter === "all" || user.status === statusFilter

        return matchesQuery && matchesRole && matchesStatus
      })
      .sort((a, b) => {
        const direction = sortDirection === "asc" ? 1 : -1

        if (sortKey === "projects") return (a.projectsCount - b.projectsCount) * direction
        if (sortKey === "chats") return (a.chatsCount - b.chatsCount) * direction
        if (sortKey === "role") return a.user.role.localeCompare(b.user.role) * direction
        return a.user.name.localeCompare(b.user.name) * direction
      })
  }, [roleFilter, search, sortDirection, sortKey, state.aiChats, state.projects, state.users, statusFilter])

  function toggleSort(nextKey: MemberSortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"))
      return
    }

    setSortKey(nextKey)
    setSortDirection(nextKey === "name" ? "asc" : "desc")
  }

  return (
    <AdminGuard>
      <div className="space-y-6">
        <AdminPageHeader
          title="Users"
          description={`${state.users.length} accounts with sorting and filtering controls.`}
        />

        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="frosted-input pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search users by name, email, or school"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(["all", "student", "admin"] as const).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setRoleFilter(role)}
                className={cn(
                  "rounded-xl border px-3 py-2 text-xs font-medium capitalize",
                  roleFilter === role
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:bg-muted",
                )}
              >
                {role === "all" ? "All roles" : role}
              </button>
            ))}
            {(["all", "active", "inactive"] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={cn(
                  "rounded-xl border px-3 py-2 text-xs font-medium capitalize",
                  statusFilter === status
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:bg-muted",
                )}
              >
                {status === "all" ? "All status" : status}
              </button>
            ))}
          </div>
        </div>

        <AdminTableCard className="border-border/80">
          {rows.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">
              No users match the current filters.
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/45">
                <TableRow className="hover:bg-transparent">
                  <TableHead>
                    <SortButton
                      label="User"
                      column="name"
                      active={sortKey === "name"}
                      direction={sortDirection}
                      onToggle={toggleSort}
                    />
                  </TableHead>
                  <TableHead>
                    <SortButton
                      label="Role"
                      column="role"
                      active={sortKey === "role"}
                      direction={sortDirection}
                      onToggle={toggleSort}
                    />
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    <SortButton
                      label="Projects"
                      column="projects"
                      active={sortKey === "projects"}
                      direction={sortDirection}
                      onToggle={toggleSort}
                    />
                  </TableHead>
                  <TableHead>
                    <SortButton
                      label="Chats"
                      column="chats"
                      active={sortKey === "chats"}
                      direction={sortDirection}
                      onToggle={toggleSort}
                    />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ user, projectsCount, chatsCount }) => (
                  <TableRow key={user.id}>
                    <TableCell className="min-w-[340px]">
                      <AdminRowLink
                        href={`/admin/members/${user.id}`}
                        primary={user.name}
                        secondary={`${user.email} | ${user.school}`}
                      />
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={user.role} />
                    </TableCell>
                    <TableCell>
                      <span className="text-sm capitalize text-muted-foreground">{user.status}</span>
                    </TableCell>
                    <TableCell className="font-medium">{projectsCount}</TableCell>
                    <TableCell className="font-medium">{chatsCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </AdminTableCard>
      </div>
    </AdminGuard>
  )
}
