"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  BellDot,
  Gauge,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  MessageSquareText,
  MoonStar,
  RotateCcw,
  Shield,
  SunMedium,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/glass"
import { useAppStore } from "@/components/providers/app-store-provider"
import { cn } from "@/lib/utils"

const adminNav = [
  { href: "/admin", label: "Overview", shortLabel: "Overview", icon: Gauge },
  { href: "/admin/users", label: "Users", shortLabel: "Users", icon: Shield },
  { href: "/admin/conversations", label: "Chats", shortLabel: "Chats", icon: MessageSquareText },
  { href: "/admin/errors", label: "Errors", shortLabel: "Errors", icon: BellDot },
]

function isActivePath(pathname: string, href: string) {
  return pathname === href || (href !== "/admin" && pathname.startsWith(href))
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const {
    currentUser,
    hydrated,
    resetDemo,
    setActiveRole,
    signOut,
    state,
    toggleTheme,
  } = useAppStore()

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-[24px] border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">Loading workspace…</p>
        </div>
      </div>
    )
  }

  if (!state.session.signedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-[24px] border bg-card p-6">
          <p className="text-sm text-muted-foreground">Sign in from the landing page first.</p>
          <Link href="/" className="mt-4 inline-flex text-sm font-medium text-primary">
            Return home
          </Link>
        </div>
      </div>
    )
  }

  const isAdmin = state.session.activeRole === "admin"
  const chatMatch = pathname.match(/^\/chat\/([^/]+)/)
  const projectMatch = pathname.match(/^\/projects\/([^/]+)/)
  const activeChat = chatMatch ? state.aiChats.find((entry) => entry.id === chatMatch[1]) : null
  const activeProjectId = projectMatch?.[1] ?? activeChat?.projectIds[0] ?? null

  const studentSidebar = (
    <>
      <Link
        href="/dashboard"
        onClick={() => setMobileNavOpen(false)}
        className={cn(
          "mb-4 flex items-center gap-3 rounded-xl px-3 py-2 text-sm",
          pathname === "/dashboard"
            ? "bg-accent text-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
      >
        <LayoutDashboard className="size-4" />
        <span>Dashboard</span>
      </Link>



      <div>
        <p className="px-3 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Projects
        </p>
        <div className="mt-2 space-y-1">
          {state.projects.map((project) => {
            const active = activeProjectId === project.id

            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                onClick={() => setMobileNavOpen(false)}
                className={cn(
                  "block truncate rounded-xl px-3 py-2 text-sm",
                  active
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {project.name}
              </Link>
            )
          })}
        </div>
      </div>

      <div className="mt-6">
        <p className="px-3 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Feedback
        </p>
        <div className="mt-2 space-y-1">
          <Link
            href="/developer-chat"
            onClick={() => setMobileNavOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2 text-sm",
              pathname === "/developer-chat"
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <LifeBuoy className="size-4 shrink-0" />
            <span className="truncate">Developer feedback</span>
          </Link>
        </div>
      </div>
    </>
  )

  const adminSidebar = (
    <nav className="space-y-1">
      {adminNav.map((item) => {
        const Icon = item.icon
        const active = isActivePath(pathname, item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileNavOpen(false)}
            className={cn(
              "flex min-w-0 items-center gap-3 rounded-xl px-3 py-2 text-sm",
              active
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col xl:flex-row">
        <aside className="hidden xl:flex xl:min-h-screen xl:w-[280px] xl:flex-col xl:border-r xl:bg-sidebar">
          <div className="border-b px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {currentUser.avatarLabel}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{currentUser.name}</p>
                <p className="truncate text-xs text-muted-foreground">{currentUser.email}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Button
                variant={isAdmin ? "outline" : "default"}
                size="sm"
                className="flex-1"
                onClick={() => setActiveRole("student")}
              >
                Student
              </Button>
              <Button
                variant={isAdmin ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setActiveRole("admin")}
              >
                Admin
              </Button>
            </div>
          </div>

          <div className="flex-1 px-3 py-4">
            {isAdmin ? adminSidebar : studentSidebar}
          </div>

          <div className="border-t px-3 py-3">
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" onClick={toggleTheme} aria-label="Toggle theme">
                {state.themeMode === "dark" ? <SunMedium /> : <MoonStar />}
              </Button>
              <Button variant="outline" onClick={resetDemo} aria-label="Reset demo">
                <RotateCcw />
              </Button>
              <Button variant="outline" onClick={signOut} aria-label="Sign out">
                <LogOut />
              </Button>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="border-b px-4 py-3 xl:hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Open navigation"
                  onClick={() => setMobileNavOpen(true)}
                >
                  <Menu />
                </Button>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{isAdmin ? "Admin workspace" : "Study workspace"}</p>
                  <p className="truncate text-xs text-muted-foreground">{currentUser.name}</p>
                </div>
              </div>
              <div className="shrink-0">
                <StatusBadge label={isAdmin ? "Admin" : "Student"} tone={isAdmin ? "developer" : "success"} />
              </div>
            </div>
          </div>
          <div className="mx-auto w-full max-w-5xl px-4 py-4 pb-8 sm:px-6 sm:py-6">{children}</div>
        </main>
      </div>

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-40 xl:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close navigation"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="relative h-full w-[86vw] max-w-[320px] border-r bg-sidebar">
            <div className="border-b px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {currentUser.avatarLabel}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{currentUser.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{currentUser.email}</p>
                </div>
              </div>
            </div>
            <div className="px-3 py-4">{isAdmin ? adminSidebar : studentSidebar}</div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
