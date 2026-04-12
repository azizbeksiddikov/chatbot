"use client"

import Image from "next/image"
import { useEffect, useRef, useState, type ChangeEvent } from "react"
import { ImagePlus, Mic, Send, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAppStore } from "@/components/providers/app-store-provider"
import type { DeveloperAttachment } from "@/lib/mock-types"
import { formatTimestamp } from "@/lib/utils"

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error("Failed to read image"))
    reader.readAsDataURL(file)
  })
}

export function DeveloperChatScreen() {
  const { sendDeveloperMessage, state } = useAppStore()
  const [draft, setDraft] = useState("")
  const [attachments, setAttachments] = useState<DeveloperAttachment[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [state.developerChat.messages.length])

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const previewUrl = await readAsDataUrl(file)
    setAttachments((prev) => [
      ...prev,
      {
        id: `att-${Math.random().toString(36).slice(2, 8)}`,
        type: "image",
        name: file.name,
        previewText: "Image preview attached for developer review.",
        previewUrl,
        sizeLabel: `${Math.max(1, Math.round(file.size / 1024 / 1024))} MB`,
      },
    ])
    event.target.value = ""
  }

  function addVoiceNote() {
    const duration = `${Math.floor(Math.random() * 60 + 10)}s`
    setAttachments((prev) => [
      ...prev,
      {
        id: `att-${Math.random().toString(36).slice(2, 8)}`,
        type: "voice",
        name: "voice-note.m4a",
        previewText: "Voice note attached for developer review.",
        durationLabel: duration,
      },
    ])
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.trim() && attachments.length === 0) return
    sendDeveloperMessage(draft.trim() || "Shared an attachment.", attachments)
    setDraft("")
    setAttachments([])
  }

  return (
    <div className="flex min-h-[calc(100vh-56px)] flex-col">
      {/* Header */}
      <div className="mb-5">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Developer support
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Feedback</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This is not the AI assistant. Send screenshots, voice notes, or text to the developer.
        </p>

        {/* Capability pills */}
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            { label: "Text messages" },
            { label: "Image attachments" },
            { label: "Voice note previews" },
          ].map(({ label }) => (
            <span
              key={label}
              className="rounded-full border bg-card px-2.5 py-1 text-xs text-muted-foreground"
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        {/* Messages */}
        <div className="flex-1 space-y-4 pb-4">
          {state.developerChat.messages.map((message) => {
            const isDeveloper = message.role === "developer"

            return (
              <div
                key={message.id}
                className={isDeveloper ? "flex justify-start" : "flex justify-end"}
              >
                <div className={`max-w-[88%] space-y-2 sm:max-w-[75%]`}>
                  {/* Label */}
                  <div
                    className={`flex items-center gap-1.5 ${isDeveloper ? "" : "justify-end"}`}
                  >
                    <p className="text-xs text-muted-foreground">
                      {isDeveloper ? "Developer" : "You"} · {formatTimestamp(message.createdAt)}
                    </p>
                  </div>

                  {/* Bubble */}
                  <div
                    className={[
                      "rounded-2xl px-4 py-3 text-sm leading-7",
                      isDeveloper
                        ? "border bg-card text-foreground"
                        : "bg-primary text-primary-foreground",
                    ].join(" ")}
                  >
                    {message.content}
                  </div>

                  {/* Attachments */}
                  {message.attachments.length > 0 && (
                    <div className="space-y-2">
                      {message.attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="overflow-hidden rounded-xl border bg-card"
                        >
                          {attachment.previewUrl ? (
                            <Image
                              src={attachment.previewUrl}
                              alt={attachment.name}
                              width={640}
                              height={320}
                              unoptimized
                              className="h-40 w-full object-cover"
                            />
                          ) : null}
                          <div className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                                {attachment.type}
                              </span>
                              <p className="text-xs font-medium">{attachment.name}</p>
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {attachment.durationLabel ?? attachment.sizeLabel ?? attachment.previewText}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* Compose area */}
        <div className="sticky bottom-4 rounded-2xl border bg-card p-3 shadow-sm">
          {/* Attachment previews */}
          {attachments.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-2 rounded-xl border bg-muted px-2.5 py-1.5"
                >
                  <span className="text-xs font-medium text-muted-foreground">
                    {att.type === "image" ? "📎" : "🎙"} {att.name}
                    {att.sizeLabel ? ` · ${att.sizeLabel}` : ""}
                    {att.durationLabel ? ` · ${att.durationLabel}` : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(att.id)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Describe a bug, share a confusing moment, or paste a screenshot…"
            rows={3}
            className="w-full resize-none bg-transparent px-1 py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />

          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex gap-1.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                title="Attach image"
              >
                <ImagePlus className="size-4" />
              </button>
              <button
                type="button"
                onClick={addVoiceNote}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                title="Add voice note (mock)"
              >
                <Mic className="size-4" />
              </button>
            </div>
            <Button size="sm" onClick={handleSubmit} disabled={!draft.trim() && attachments.length === 0}>
              <Send />
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
