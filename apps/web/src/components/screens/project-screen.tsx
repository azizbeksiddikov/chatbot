"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  MessageSquarePlus,
  MessageSquareText,
  NotebookPen,
  Pencil,
  Plus,
  Trash2,
  UploadCloud,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAppStore } from "@/components/providers/app-store-provider"
import { formatRelativeDate } from "@/lib/utils"
import type { DocumentStatus } from "@/lib/mock-types"

const CHATS_PER_PAGE = 10

function StatusDot({ status }: { status: DocumentStatus }) {
  if (status === "ready")
    return <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
  if (status === "processing")
    return <Loader2 className="mt-0.5 size-3.5 shrink-0 animate-spin text-muted-foreground" />
  if (status === "error")
    return <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-rose-500" />
  return <Loader2 className="mt-0.5 size-3.5 shrink-0 animate-spin text-muted-foreground" />
}

export function ProjectScreen({ projectId }: { projectId: string }) {
  const router = useRouter()
  const {
    addTextNote,
    deleteDocument,
    ensureAiChat,
    queueFakeUpload,
    startNewAiChat,
    state,
    updateTextNote,
  } = useAppStore()

  const [isAddingNote, setIsAddingNote] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteTitle, setNoteTitle] = useState("")
  const [noteBody, setNoteBody] = useState("")
  const [chatPage, setChatPage] = useState(0)

  const project = state.projects.find((p) => p.id === projectId)
  const documents = state.documents
    .filter((d) => d.projectId === projectId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  const allChats = state.aiChats
    .filter((c) => c.projectIds.includes(projectId))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

  const totalChatPages = Math.ceil(allChats.length / CHATS_PER_PAGE)
  const chats = allChats.slice(chatPage * CHATS_PER_PAGE, (chatPage + 1) * CHATS_PER_PAGE)

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          <FileText className="size-6 text-muted-foreground" />
        </div>
        <p className="mt-4 text-sm font-medium">Project not found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          This project is missing from the local preview state.
        </p>
        <Button size="sm" className="mt-4" onClick={() => router.push("/dashboard")}>
          Back to dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className="mt-1 h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {project.courseCode}
            </p>
            <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">{project.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const chatId = ensureAiChat(project.id)
              router.push(`/chat/${chatId}`)
            }}
          >
            <MessageSquareText />
            Open chat
          </Button>
          <Button
            size="sm"
            onClick={() => {
              const chatId = startNewAiChat(project.id)
              router.push(`/chat/${chatId}`)
            }}
          >
            <MessageSquarePlus />
            New chat
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Files */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">
              Files
              {documents.length > 0 && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {documents.length}
                </span>
              )}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  queueFakeUpload(project.id, `${project.courseCode}-lecture.pdf`, "pdf")
                }
              >
                <UploadCloud />
                PDF
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  queueFakeUpload(project.id, `${project.courseCode}-slides.pptx`, "pptx")
                }
              >
                <UploadCloud />
                Slides
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsAddingNote(true)
                  setNoteTitle("")
                  setNoteBody("")
                }}
              >
                <NotebookPen />
                Note
              </Button>
            </div>
          </div>

          {/* Add note form */}
          {isAddingNote && (
            <div className="rounded-2xl border bg-card p-4">
              <p className="text-sm font-semibold">New note</p>
              <div className="mt-3 space-y-2">
                <input
                  className="frosted-input"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="Title"
                  autoFocus
                />
                <textarea
                  className="frosted-input min-h-28"
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  placeholder="Paste or type your notes here..."
                />
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  disabled={!noteTitle.trim() || !noteBody.trim()}
                  onClick={() => {
                    addTextNote(project.id, noteTitle.trim(), noteBody.trim())
                    setIsAddingNote(false)
                  }}
                >
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsAddingNote(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Document list */}
          {documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-12 text-center">
              <UploadCloud className="size-7 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">No files yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Upload a file or add a note to build the knowledge base.
              </p>
            </div>
          ) : (
            <div className="divide-y rounded-2xl border bg-card">
              {documents.map((doc) => {
                const isEditing = editingNoteId === doc.id

                return (
                  <div key={doc.id}>
                    <div className="flex items-start gap-3 px-4 py-3">
                      <StatusDot status={doc.status} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium leading-snug">{doc.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {doc.kind.toUpperCase()}
                          {doc.chunkCount != null && doc.chunkCount > 0 && (
                            <> · {doc.chunkCount} chunks</>
                          )}
                          {doc.sizeLabel && <> · {doc.sizeLabel}</>}
                          {" · "}{formatRelativeDate(doc.updatedAt)}
                        </p>
                        {doc.status === "error" && doc.errorMessage && (
                          <p className="mt-1.5 text-xs leading-5 text-rose-500">
                            {doc.errorMessage}
                          </p>
                        )}
                        {doc.kind === "note" && doc.noteText && !isEditing && (
                          <p className="mt-1.5 text-xs leading-5 text-muted-foreground line-clamp-2">
                            {doc.noteText}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {doc.kind === "note" && !isEditing && (
                          <button
                            type="button"
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                            onClick={() => {
                              setEditingNoteId(doc.id)
                              setNoteTitle(doc.title)
                              setNoteBody(doc.noteText ?? "")
                            }}
                          >
                            <Pencil className="size-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                          onClick={() => deleteDocument(doc.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Inline note edit */}
                    {isEditing && (
                      <div className="border-t px-4 pb-4 pt-3 space-y-2">
                        <input
                          className="frosted-input"
                          value={noteTitle}
                          onChange={(e) => setNoteTitle(e.target.value)}
                        />
                        <textarea
                          className="frosted-input min-h-28"
                          value={noteBody}
                          onChange={(e) => setNoteBody(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            disabled={!noteTitle.trim() || !noteBody.trim()}
                            onClick={() => {
                              updateTextNote(doc.id, noteTitle.trim(), noteBody.trim())
                              setEditingNoteId(null)
                            }}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingNoteId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Chats sidebar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">
              Chats
              {allChats.length > 0 && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {allChats.length}
                </span>
              )}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const id = startNewAiChat(project.id)
                router.push(`/chat/${id}`)
              }}
            >
              <Plus />
              New
            </Button>
          </div>

          {allChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-8 text-center">
              <MessageSquareText className="size-6 text-muted-foreground" />
              <p className="mt-2 text-xs text-muted-foreground">No chats yet.</p>
            </div>
          ) : (
            <>
              <div className="divide-y rounded-2xl border bg-card">
                {chats.map((chat) => (
                  <Link
                    key={chat.id}
                    href={`/chat/${chat.id}`}
                    className="flex items-center gap-3 px-3 py-3 first:rounded-t-2xl last:rounded-b-2xl hover:bg-muted/50"
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

              {totalChatPages > 1 && (
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    disabled={chatPage === 0}
                    onClick={() => setChatPage((p) => p - 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border bg-card text-muted-foreground hover:bg-muted disabled:opacity-30"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <span className="text-xs text-muted-foreground">
                    {chatPage + 1} / {totalChatPages}
                  </span>
                  <button
                    type="button"
                    disabled={chatPage >= totalChatPages - 1}
                    onClick={() => setChatPage((p) => p + 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border bg-card text-muted-foreground hover:bg-muted disabled:opacity-30"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
