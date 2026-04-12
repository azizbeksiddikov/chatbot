"use client"

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type PropsWithChildren,
} from "react"
import {
  addAiAssistantMessage,
  addAiUserMessage,
  addDeveloperReply,
  addDocument,
  completeOnboarding,
  createAiChat,
  createProject,
  deleteDocument,
  deleteProject,
  deriveAdminDashboardData,
  getCurrentUser,
  getInitialState,
  sendDeveloperMessage,
  setActiveRole,
  setTheme,
  signIn,
  signOut,
  toggleTheme,
  updateDocumentStatus,
  updateNote,
  updateProject,
} from "@/lib/mock-repository"
import type {
  AdminDashboardData,
  AppState,
  DeveloperAttachment,
  ThemeMode,
  UserRole,
} from "@/lib/mock-types"

const STORAGE_KEY = "campus-rag-mock-app-state"

function buildAiResponse(prompt: string) {
  const lowerPrompt = prompt.toLowerCase()

  if (lowerPrompt.includes("oxidative") || lowerPrompt.includes("atp")) {
    return "Explain the membrane location first, then move through electron transfer, proton pumping, and ATP synthase. For stronger exam confidence, end with what breaks when the chain is inhibited or uncoupled."
  }

  if (lowerPrompt.includes("entropy") || lowerPrompt.includes("thermo")) {
    return "Anchor the answer around probability and accessible microstates. Then connect that intuition back to the equation so the concept and the formalism reinforce each other."
  }

  if (lowerPrompt.includes("design") || lowerPrompt.includes("research")) {
    return "Frame the response around the user problem, the observed evidence, and the product implication. That structure tends to feel both concise and trustworthy."
  }

  return "This mock answer is intentionally product-shaped: concise, source-aware, and easy to scan. Later, the backend can replace it with real retrieval and streaming without changing this interface much."
}

type AppStoreValue = {
  state: AppState
  hydrated: boolean
  currentUser: ReturnType<typeof getCurrentUser>
  adminDashboard: AdminDashboardData
  signIn: () => void
  signOut: () => void
  completeOnboarding: () => void
  toggleTheme: () => void
  setTheme: (theme: ThemeMode) => void
  setActiveRole: (role: UserRole) => void
  createProject: (input: { name: string; description: string }) => string
  updateProject: (
    projectId: string,
    input: Partial<{ name: string; description: string; courseCode: string }>,
  ) => void
  deleteProject: (projectId: string) => void
  queueFakeUpload: (projectId: string, fileName: string, kind: "pdf" | "pptx" | "txt") => void
  addTextNote: (projectId: string, title: string, noteText: string) => void
  updateTextNote: (documentId: string, title: string, noteText: string) => void
  deleteDocument: (documentId: string) => void
  ensureAiChat: (projectId: string) => string
  startNewAiChat: (projectId: string) => string
  sendAiMessage: (chatId: string, content: string) => void
  sendDeveloperMessage: (content: string, attachments: DeveloperAttachment[]) => void
  resetDemo: () => void
}

const AppStoreContext = createContext<AppStoreValue | null>(null)

export function AppStoreProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AppState>(() => {
    if (typeof window === "undefined") {
      return getInitialState()
    }

    const saved = window.localStorage.getItem(STORAGE_KEY)

    if (!saved) {
      return getInitialState()
    }

    try {
      return JSON.parse(saved) as AppState
    } catch {
      window.localStorage.removeItem(STORAGE_KEY)
      return getInitialState()
    }
  })
  const hydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  )
  const aiTimers = useRef<number[]>([])
  const uploadTimers = useRef<number[]>([])
  const developerTimers = useRef<number[]>([])

  useEffect(() => {
    if (!hydrated) return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [hydrated, state])

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle("dark", state.themeMode === "dark")
    root.style.colorScheme = state.themeMode
  }, [state.themeMode])

  useEffect(() => {
    const ai = aiTimers.current
    const uploads = uploadTimers.current
    const developer = developerTimers.current

    return () => {
      ai.forEach((timer) => window.clearTimeout(timer))
      uploads.forEach((timer) => window.clearTimeout(timer))
      developer.forEach((timer) => window.clearTimeout(timer))
    }
  }, [])

  const value: AppStoreValue = {
    state,
    hydrated,
    currentUser: getCurrentUser(state),
    adminDashboard: deriveAdminDashboardData(state),
    signIn: () => setState((previous) => signIn(previous)),
    signOut: () => setState((previous) => signOut(previous)),
    completeOnboarding: () => setState((previous) => completeOnboarding(previous)),
    toggleTheme: () => setState((previous) => toggleTheme(previous)),
    setTheme: (theme) => setState((previous) => setTheme(previous, theme)),
    setActiveRole: (role) => setState((previous) => setActiveRole(previous, role)),
    createProject: (input) => {
      let projectId = ""

      setState((previous) => {
        const next = createProject(previous, input)
        projectId = next.projects[0]?.id ?? ""
        return next
      })

      return projectId
    },
    updateProject: (projectId, input) =>
      setState((previous) => updateProject(previous, projectId, input)),
    deleteProject: (projectId) => setState((previous) => deleteProject(previous, projectId)),
    queueFakeUpload: (projectId, fileName, kind) => {
      let documentId = ""

      setState((previous) => {
        const next = addDocument(previous, projectId, {
          title: fileName,
          kind,
          sizeLabel: kind === "pdf" ? "6.2 MB" : kind === "pptx" ? "3.9 MB" : "0.4 MB",
          status: "processing",
        })
        documentId = next.documents[0]?.id ?? ""
        return next
      })

      if (!documentId) return

      const finishTimer = window.setTimeout(() => {
        const succeeds = Math.random() > 0.18
        setState((previous) =>
          updateDocumentStatus(previous, documentId, {
            status: succeeds ? "ready" : "error",
            chunkCount: succeeds ? (kind === "pdf" ? 38 : kind === "pptx" ? 24 : 12) : 0,
            errorMessage: succeeds
              ? undefined
              : "The preview import hit a mock parsing error. Try renaming or re-uploading.",
          }),
        )
      }, 1850)

      uploadTimers.current.push(finishTimer)
    },
    addTextNote: (projectId, title, noteText) =>
      setState((previous) =>
        addDocument(previous, projectId, {
          title,
          kind: "note",
          noteText,
          status: "ready" as const,
        }),
      ),
    updateTextNote: (documentId, title, noteText) =>
      setState((previous) => updateNote(previous, documentId, { title, noteText })),
    deleteDocument: (documentId) => setState((previous) => deleteDocument(previous, documentId)),
    ensureAiChat: (projectId) => {
      let chatId = ""

      setState((previous) => {
        const next = createAiChat(previous, projectId, { reuseExisting: true })
        chatId = next.chatId
        return next.state
      })

      return chatId
    },
    startNewAiChat: (projectId) => {
      let chatId = ""

      setState((previous) => {
        const next = createAiChat(previous, projectId, { reuseExisting: false })
        chatId = next.chatId
        return next.state
      })

      return chatId
    },
    sendAiMessage: (chatId, content) => {
      setState((previous) => addAiUserMessage(previous, chatId, content))

      const timer = window.setTimeout(() => {
        setState((previous) => addAiAssistantMessage(previous, chatId, buildAiResponse(content)))
      }, 1100)

      aiTimers.current.push(timer)
    },
    sendDeveloperMessage: (content, attachments) => {
      setState((previous) => sendDeveloperMessage(previous, { content, attachments }))

      const timer = window.setTimeout(() => {
        setState((previous) =>
          addDeveloperReply(
            previous,
            "Thanks. We saved this in the mock support thread so we can judge how the UX feels before wiring a real backend.",
          ),
        )
      }, 900)

      developerTimers.current.push(timer)
    },
    resetDemo: () => {
      window.localStorage.removeItem(STORAGE_KEY)
      setState(getInitialState())
    },
  }

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>
}

export function useAppStore() {
  const context = useContext(AppStoreContext)

  if (!context) {
    throw new Error("useAppStore must be used within AppStoreProvider")
  }

  return context
}
