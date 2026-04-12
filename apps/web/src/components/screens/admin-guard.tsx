"use client"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/glass"
import { useAppStore } from "@/components/providers/app-store-provider"

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { setActiveRole, state } = useAppStore()

  if (state.session.activeRole !== "admin") {
    return (
      <EmptyState
        title="Admin preview is hidden in student mode"
        description="Switch the mock role to admin from the shell to inspect moderation, analytics, and conversation oversight flows."
        action={
          <Button className="rounded-full" onClick={() => setActiveRole("admin")}>
            Switch to admin
          </Button>
        }
      />
    )
  }

  return <>{children}</>
}
