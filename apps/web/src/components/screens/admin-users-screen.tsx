"use client"

import { useState } from "react"
import { Search } from "lucide-react"
import { AdminGuard } from "@/components/screens/admin-guard"
import { useAppStore } from "@/components/providers/app-store-provider"

export function AdminUsersScreen() {
  const { state } = useAppStore()
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<"all" | "student" | "admin">("all")

  const filtered = state.users.filter((user) => {
    const matchSearch =
      !search ||
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      user.school.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === "all" || user.role === roleFilter
    return matchSearch && matchRole
  })

  return (
    <AdminGuard>
      <div className="space-y-6">
        {/* Page header */}
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Admin
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {state.users.length} accounts · {state.users.filter((u) => u.status === "active").length} active
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="frosted-input pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or department…"
            />
          </div>
          <div className="flex gap-1.5">
            {(["all", "student", "admin"] as const).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setRoleFilter(role)}
                className={[
                  "rounded-xl border px-3 py-2 text-xs font-medium capitalize transition-colors",
                  roleFilter === role
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:bg-muted",
                ].join(" ")}
              >
                {role === "all" ? "All roles" : role}
              </button>
            ))}
          </div>
        </div>

        {/* User list */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed py-12 text-center">
              <p className="text-sm text-muted-foreground">No users match the filter.</p>
            </div>
          ) : (
            filtered.map((user) => {
              const projectCount = state.projects.filter((p) => p.ownerUserId === user.id).length
              const chatCount = state.aiChats.filter((c) =>
                state.projects
                  .filter((p) => p.ownerUserId === user.id)
                  .some((p) => c.projectIds.includes(p.id)),
              ).length

              return (
                <div key={user.id} className="rounded-2xl border bg-card">
                  {/* Mobile layout */}
                  <div className="flex items-start gap-3 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                      {user.avatarLabel}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="text-sm font-medium">{user.name}</p>
                        <span
                          className={[
                            "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                            user.role === "admin"
                              ? "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                              : "bg-sky-500/10 text-sky-600 dark:text-sky-400",
                          ].join(" ")}
                        >
                          {user.role}
                        </span>
                        <span
                          className={[
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                            user.status === "active"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-muted text-muted-foreground",
                          ].join(" ")}
                        >
                          {user.status}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{user.email}</p>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span>{user.school}</span>
                        <span>{projectCount} {projectCount === 1 ? "project" : "projects"}</span>
                        <span>{chatCount} {chatCount === 1 ? "chat" : "chats"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </AdminGuard>
  )
}
