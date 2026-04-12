"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, BookOpen, MessageSquare, MoonStar, SunMedium, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAppStore } from "@/components/providers/app-store-provider"

const features = [
  {
    icon: BookOpen,
    label: "Knowledge bases",
    description: "Upload PDFs, slides, and notes. The AI answers only from your material.",
  },
  {
    icon: MessageSquare,
    label: "Cited answers",
    description: "Every response links back to the exact page or slide it came from.",
  },
  {
    icon: Zap,
    label: "Always free",
    description: "Built on free-tier APIs. No credit card, no usage caps for students.",
  },
]

export function HomeScreen() {
  const router = useRouter()
  const { hydrated, signIn, state, toggleTheme } = useAppStore()

  useEffect(() => {
    if (!hydrated || !state.session.signedIn) return
    router.replace(state.onboarding.completed ? "/dashboard" : "/onboarding")
  }, [hydrated, router, state.onboarding.completed, state.session.signedIn])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <BookOpen className="size-3.5 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold">Campus RAG</span>
        </div>
        <Button variant="outline" size="icon-sm" onClick={toggleTheme} aria-label="Toggle theme">
          {state.themeMode === "dark" ? <SunMedium /> : <MoonStar />}
        </Button>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-lg text-center">
          <div className="mb-4 inline-flex items-center rounded-full border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            Mock preview — no backend required
          </div>

          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Study smarter with your own notes
          </h1>

          <p className="mx-auto mt-4 max-w-sm text-base leading-7 text-muted-foreground">
            Upload lecture materials. Ask questions. Get answers with citations pointing to the exact page.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              onClick={() => {
                signIn()
                router.push(state.onboarding.completed ? "/dashboard" : "/onboarding")
              }}
            >
              Get started
              <ArrowRight />
            </Button>
            <Link
              href="/dashboard"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border bg-card px-5 text-sm font-medium text-foreground hover:bg-muted"
            >
              Skip to demo
            </Link>
          </div>
        </div>

        {/* Feature cards */}
        <div className="mt-16 w-full max-w-2xl">
          <div className="grid gap-3 sm:grid-cols-3">
            {features.map(({ icon: Icon, label, description }) => (
              <div
                key={label}
                className="rounded-2xl border bg-card p-4"
              >
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="size-4 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <p className="mt-10 text-xs text-muted-foreground">
          All data is stored locally in your browser. Nothing leaves your device.
        </p>
      </main>
    </div>
  )
}
