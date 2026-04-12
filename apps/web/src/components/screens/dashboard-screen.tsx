"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, ChevronDown, FolderOpen, MessageSquarePlus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAppStore } from "@/components/providers/app-store-provider"
import { formatRelativeDate } from "@/lib/utils"

export function DashboardScreen() {
  const router = useRouter()
  const { currentUser, startNewAiChat, state } = useAppStore()

  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    state.projects[0]?.id ?? "",
  )
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  const project = state.projects.find((p) => p.id === selectedProjectId) ?? null
  const chats = project
    ? state.aiChats
        .filter((c) => c.projectIds.includes(project.id))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    : []

  const firstName = currentUser.name.split(" ")[0]

  return (
    <div className="mx-auto flex min-h-[calc(100vh-56px)] w-full max-w-lg flex-col justify-center px-2 py-12">
      {/* Greeting */}
      <h1 className="text-3xl font-semibold tracking-tight">Hello, {firstName}.</h1>
      <p className="mt-1 text-sm text-muted-foreground">Select a project to continue.</p>

      {/* Project selector */}
      <div className="mt-6">
        {state.projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-card p-6 text-center">
            <FolderOpen className="mx-auto size-7 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No projects yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Create a project to get started.
            </p>
            <Button size="sm" className="mt-4" onClick={() => router.push("/projects/new")}>
              <Plus />
              New project
            </Button>
          </div>
        ) : (
          <div ref={dropdownRef} className="relative">
            {/* Trigger */}
            <button
              type="button"
              onClick={() => setDropdownOpen((o) => !o)}
              className="flex w-full items-center gap-3 rounded-2xl border bg-card px-4 py-3.5 text-sm transition-colors hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {project && (
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: project.color }}
                />
              )}
              <span className="flex-1 text-left font-medium text-foreground">
                {project ? `${project.courseCode} — ${project.name}` : "Select a project"}
              </span>
              <ChevronDown
                className={`size-4 shrink-0 text-muted-foreground transition-transform duration-150 ${
                  dropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Options */}
            {dropdownOpen && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1.5 overflow-hidden rounded-2xl border bg-card shadow-xl">
                {state.projects.map((p) => {
                  const active = p.id === selectedProjectId
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedProjectId(p.id)
                        setDropdownOpen(false)
                      }}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-sm transition-colors first:pt-3.5 last:pb-3.5 ${
                        active ? "bg-accent" : "hover:bg-muted/50"
                      }`}
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: p.color }}
                      />
                      <span className="flex-1 text-left">
                        <span className="font-medium">{p.courseCode}</span>
                        <span className="ml-1.5 text-muted-foreground">— {p.name}</span>
                      </span>
                      {active && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      {project && (
        <div className="mt-3 flex gap-2">
          <Button
            className="flex-1"
            onClick={() => {
              const chatId = startNewAiChat(project.id)
              router.push(`/chat/${chatId}`)
            }}
          >
            <MessageSquarePlus />
            New conversation
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/projects/${project.id}`)}
          >
            <FolderOpen />
            Open project
          </Button>
        </div>
      )}

      {/* Recent chats */}
      {chats.length > 0 && (
        <div className="mt-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Recent conversations
          </p>
          <div className="space-y-1.5">
            {chats.slice(0, 5).map((chat) => (
              <Link
                key={chat.id}
                href={`/chat/${chat.id}`}
                className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 hover:bg-muted/50"
              >
                <div
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: chat.color, opacity: 0.65 }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{chat.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatRelativeDate(chat.updatedAt)}
                  </p>
                </div>
                <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {project && chats.length === 0 && (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          No conversations yet for this project.
        </p>
      )}

      <div className="mt-10 text-center">
        <Link
          href="/projects"
          className="text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          Manage all projects
        </Link>
      </div>
    </div>
  )
}
