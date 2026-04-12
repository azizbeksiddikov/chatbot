"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Bot, CheckCircle2, FolderKanban, MessageCircleHeart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAppStore } from "@/components/providers/app-store-provider"

const steps = [
  {
    icon: FolderKanban,
    label: "Projects",
    title: "Organize by course, not by chat",
    description:
      "Each project holds a knowledge base — your PDFs, slides, and notes. You can have up to 10 projects. The AI only answers from the material inside the active project.",
  },
  {
    icon: Bot,
    label: "AI chat",
    title: "Ask questions, get cited answers",
    description:
      "The study chat is text-only and focused. Ask a question, get an answer with citations that point to the exact page or slide in your uploaded files. No hallucinations from the open web.",
  },
  {
    icon: MessageCircleHeart,
    label: "Feedback",
    title: "A human lane for bugs and feedback",
    description:
      "The developer chat is separate from your study work. Use it to send screenshots, describe issues, or share ideas. It supports image attachments and voice note previews.",
  },
]

export function OnboardingScreen() {
  const router = useRouter()
  const { completeOnboarding, hydrated, state } = useAppStore()
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    if (!hydrated) return
    if (!state.session.signedIn) router.replace("/")
    if (state.onboarding.completed) router.replace("/dashboard")
  }, [hydrated, router, state.onboarding.completed, state.session.signedIn])

  const step = steps[stepIndex]
  const isLast = stepIndex === steps.length - 1

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Progress bar */}
      <div className="h-1 w-full bg-border">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
        />
      </div>

      <main className="flex flex-1 flex-col px-4 py-8 sm:px-6">
        <div className="mx-auto w-full max-w-md">
          {/* Step indicator */}
          <p className="text-xs font-medium text-muted-foreground">
            Step {stepIndex + 1} of {steps.length}
          </p>

          {/* Step nav pills */}
          <div className="mt-4 flex gap-2">
            {steps.map((s, i) => {
              const Icon = s.icon
              const done = i < stepIndex
              const active = i === stepIndex

              return (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => setStepIndex(i)}
                  className={[
                    "flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-medium transition-colors",
                    active
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : done
                        ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "border-border bg-card text-muted-foreground",
                  ].join(" ")}
                >
                  {done ? (
                    <CheckCircle2 className="size-3.5" />
                  ) : (
                    <Icon className="size-3.5" />
                  )}
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
              )
            })}
          </div>

          {/* Step content */}
          <div className="mt-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <step.icon className="size-7 text-primary" />
            </div>

            <h1 className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">
              {step.title}
            </h1>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {step.description}
            </p>
          </div>

          {/* Preview callout */}
          <div className="mt-6 rounded-2xl border bg-muted/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Preview
            </p>

            {stepIndex === 0 && (
              <div className="mt-3 space-y-2">
                {["BIO 204 — Cell Biology", "DES 311 — Research Methods", "PHY 101 — Mechanics"].map((name) => (
                  <div key={name} className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <p className="text-sm">{name}</p>
                  </div>
                ))}
              </div>
            )}

            {stepIndex === 1 && (
              <div className="mt-3 space-y-2.5">
                <div className="rounded-xl border bg-muted px-3 py-2.5">
                  <p className="text-xs text-muted-foreground">You</p>
                  <p className="mt-0.5 text-sm">What is oxidative phosphorylation?</p>
                </div>
                <div className="rounded-xl border bg-card px-3 py-2.5">
                  <p className="text-xs text-muted-foreground">AI</p>
                  <p className="mt-0.5 text-sm leading-6">
                    It uses the proton gradient across the inner mitochondrial membrane to synthesize ATP via ATP synthase.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                      Lecture 3 — p.15
                    </span>
                    <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                      Slides — slide 8
                    </span>
                  </div>
                </div>
              </div>
            )}

            {stepIndex === 2 && (
              <div className="mt-3 space-y-2.5">
                <div className="flex items-start gap-3 rounded-xl border bg-muted px-3 py-2.5">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
                    MJ
                  </div>
                  <div>
                    <p className="text-sm">The sidebar feels cramped on mobile.</p>
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg border bg-card px-2 py-1 text-xs text-muted-foreground">
                      <span>📎</span>
                      <span>screenshot.png · 1 MB</span>
                    </div>
                  </div>
                </div>
                <div className="ml-10 rounded-xl border bg-card px-3 py-2.5">
                  <p className="text-sm">Got it — saved for review before we wire the real backend.</p>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="mt-8 flex gap-3">
            {stepIndex > 0 && (
              <Button variant="outline" onClick={() => setStepIndex((i) => i - 1)} className="flex-1">
                Back
              </Button>
            )}
            {isLast ? (
              <Button
                className="flex-1"
                onClick={() => {
                  completeOnboarding()
                  router.push("/dashboard")
                }}
              >
                Open dashboard
                <ArrowRight />
              </Button>
            ) : (
              <Button className="flex-1" onClick={() => setStepIndex((i) => i + 1)}>
                Next
                <ArrowRight />
              </Button>
            )}
          </div>

          <button
            type="button"
            className="mt-4 w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => {
              completeOnboarding()
              router.push("/dashboard")
            }}
          >
            Skip intro
          </button>
        </div>
      </main>
    </div>
  )
}
