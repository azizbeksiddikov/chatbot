"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Bot, ExternalLink, Loader2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAppStore } from "@/components/providers/app-store-provider"
import { formatTimestamp } from "@/lib/utils"

export function AiChatScreen({ chatId }: { chatId: string }) {
  const router = useRouter()
  const { sendAiMessage, state } = useAppStore()
  const [draft, setDraft] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const chat = state.aiChats.find((c) => c.id === chatId)
  const project = chat ? state.projects.find((p) => p.id === chat.projectIds[0]) : null

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chat?.messages.length])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.trim() || chat?.isGenerating) return
    sendAiMessage(chatId, draft.trim())
    setDraft("")
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setDraft(e.target.value)
    e.target.style.height = "auto"
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`
  }

  if (!chat) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          <Bot className="size-6 text-muted-foreground" />
        </div>
        <p className="mt-4 text-sm font-medium">Chat not found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          This chat is missing from local preview state.
        </p>
        <Button size="sm" className="mt-4" onClick={() => router.push("/dashboard")}>
          Back to dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="flex min-h-[calc(100vh-56px)] flex-col xl:min-h-[calc(100vh-0px)]">
      {/* Chat header */}
      <div className="mb-4">
        <Link
          href={`/projects/${chat.projectIds[0]}`}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          {project?.name ?? "Back to project"}
        </Link>
        <div className="mt-2 flex items-center gap-2.5">
          <div
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: chat.color }}
          />
          <h1 className="text-base font-semibold">{chat.title}</h1>
        </div>
        {project && (
          <p className="mt-1 ml-5 text-xs text-muted-foreground">
            {project.courseCode} · {project.name}
          </p>
        )}
      </div>

      <div className="flex flex-1 flex-col">
        {/* Message area */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="mx-auto w-full max-w-2xl flex-1 space-y-6 pb-4">
            {chat.messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <Bot className="size-6 text-primary" />
                </div>
                <p className="mt-4 text-base font-semibold">
                  {project ? project.name : "Study assistant"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Answers only from your uploaded material.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {[
                    "Summarize the key concepts",
                    "What's on the exam?",
                    "Explain the main argument",
                  ].map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      className="rounded-xl border bg-card px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                      onClick={() => sendAiMessage(chatId, prompt)}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              chat.messages.map((message) => (
                <div key={message.id}>
                  {message.role === "user" ? (
                    /* User message — right-aligned pill */
                    <div className="flex justify-end">
                      <div className="max-w-[80%] rounded-2xl bg-primary px-4 py-3 text-sm leading-7 text-primary-foreground">
                        {message.content}
                      </div>
                    </div>
                  ) : (
                    /* Assistant message — left-aligned, no bubble */
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary">
                          <Bot className="size-3.5 text-primary-foreground" />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground">
                          {formatTimestamp(message.createdAt)}
                        </span>
                      </div>
                      <p className="pl-8 text-sm leading-7">{message.content}</p>

                      {/* Source links */}
                      {message.citations.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pl-8">
                          {message.citations.map((citation) => {
                            const doc = state.documents.find((d) => d.title === citation.label)
                            const href = doc
                              ? `/projects/${doc.projectId}`
                              : project
                                ? `/projects/${project.id}`
                                : "/dashboard"
                            return (
                              <Link
                                key={citation.id}
                                href={href}
                                className="inline-flex items-center gap-1 rounded-lg border bg-primary/5 px-2.5 py-1 text-xs text-primary transition-colors hover:bg-primary/10"
                              >
                                <ExternalLink className="size-2.5" />
                                {citation.label}
                                {citation.location && (
                                  <span className="opacity-60">· {citation.location}</span>
                                )}
                              </Link>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Generating indicator */}
            {chat.isGenerating && (
              <div className="flex items-center gap-2 pl-8">
                <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Thinking…</span>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="sticky bottom-4 mx-auto w-full max-w-2xl rounded-2xl border bg-card px-4 py-3 shadow-sm"
          >
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your material…"
              rows={1}
              className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              style={{ minHeight: "36px", maxHeight: "160px" }}
            />
            <div className="mt-2 flex items-center justify-end gap-2">
              <button
                type="submit"
                disabled={!draft.trim() || chat.isGenerating}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
              >
                <Send className="size-3.5" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
