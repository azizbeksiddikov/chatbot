"use client"

import { Bot, LifeBuoy, MessageSquareText } from "lucide-react"
import { AdminGuard } from "@/components/screens/admin-guard"
import { useAppStore } from "@/components/providers/app-store-provider"
import { formatTimestamp } from "@/lib/utils"

export function AdminConversationsScreen() {
  const { state } = useAppStore()

  const conversations = [
    ...state.aiChats.map((chat) => {
      const project = state.projects.find((p) => p.id === chat.projectIds[0])
      const user = state.users.find((u) =>
        state.projects.some((p) => p.id === chat.projectIds[0] && p.ownerUserId === u.id),
      )
      return {
        id: chat.id,
        type: "AI chat" as const,
        title: chat.title,
        updatedAt: chat.updatedAt,
        messageCount: chat.messages.length,
        meta: project?.courseCode ?? "Unknown project",
        userName: user?.name ?? "Unknown user",
        color: chat.color,
        lastMessage: chat.messages[chat.messages.length - 1]?.content ?? chat.summary,
      }
    }),
    {
      id: state.developerChat.id,
      type: "Support" as const,
      title: state.developerChat.title,
      updatedAt: state.developerChat.updatedAt,
      messageCount: state.developerChat.messages.length,
      meta: "Developer feedback lane",
      userName: "All users",
      color: state.developerChat.accent,
      lastMessage:
        state.developerChat.messages[state.developerChat.messages.length - 1]?.content ?? "",
    },
  ].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

  return (
    <AdminGuard>
      <div className="space-y-6">
        {/* Page header */}
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Admin
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Conversations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {conversations.length} threads · AI study chats and support
          </p>
        </div>

        {/* Conversation list */}
        <div className="space-y-2">
          {conversations.map((conv) => {
            const isSupport = conv.type === "Support"
            const Icon = isSupport ? LifeBuoy : Bot

            return (
              <div key={conv.id} className="rounded-2xl border bg-card p-4">
                <div className="flex items-start gap-3">
                  {/* Type indicator */}
                  <div
                    className={[
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      isSupport
                        ? "bg-orange-500/10"
                        : "bg-sky-500/10",
                    ].join(" ")}
                  >
                    <Icon
                      className={`size-4 ${isSupport ? "text-orange-500" : "text-sky-500"}`}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="text-sm font-medium">{conv.title}</p>
                      <span
                        className={[
                          "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                          isSupport
                            ? "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                            : "bg-sky-500/10 text-sky-600 dark:text-sky-400",
                        ].join(" ")}
                      >
                        {conv.type}
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                      <span>{conv.userName}</span>
                      <span>·</span>
                      <span>{conv.meta}</span>
                      <span>·</span>
                      <span>
                        {conv.messageCount} {conv.messageCount === 1 ? "message" : "messages"}
                      </span>
                      <span>·</span>
                      <span>{formatTimestamp(conv.updatedAt)}</span>
                    </div>

                    {conv.lastMessage && (
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                        &ldquo;{conv.lastMessage}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="ml-auto shrink-0">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: conv.color }}
                    />
                  </div>
                </div>

                {/* Message count bar */}
                <div className="mt-3 flex items-center gap-2">
                  <MessageSquareText className="size-3 text-muted-foreground" />
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/40"
                      style={{
                        width: `${Math.min(100, (conv.messageCount / 20) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{conv.messageCount}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </AdminGuard>
  )
}
