import type {
  AdminDashboardData,
  AiChat,
  AppState,
  DeveloperAttachment,
  Document,
  DocumentKind,
  DocumentStatus,
  Project,
  ThemeMode,
  UserRole
} from '@/lib/mock-types';

const PROJECT_COLORS = [
  '#3b82f6',
  '#14b8a6',
  '#f97316',
  '#ec4899',
  '#6366f1',
  '#22c55e'
];
const CHAT_COLORS = [
  '#38bdf8',
  '#f59e0b',
  '#34d399',
  '#a78bfa',
  '#f87171',
  '#2dd4bf'
];

function nowIso() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function inferCourseCode(name: string, index: number) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part[0]?.toUpperCase() ?? 'X')
    .join('');

  const fallback = letters.length >= 2 ? letters : 'CRS';
  return `${fallback} ${String(100 + index)}`;
}

function firstStudentId(state: AppState) {
  return (
    state.users.find((user) => user.role === 'student')?.id ??
    state.users[0]?.id ??
    'u-student'
  );
}

function cloneState(state: AppState): AppState {
  return {
    ...state,
    session: { ...state.session },
    onboarding: { ...state.onboarding },
    users: [...state.users],
    projects: [...state.projects],
    documents: [...state.documents],
    aiChats: [...state.aiChats],
    developerChat: {
      ...state.developerChat,
      messages: [...state.developerChat.messages]
    },
    systemErrors: [...state.systemErrors]
  };
}

export function getInitialState(): AppState {
  const seed = new Date(Date.now() - 1000 * 60 * 60 * 6);
  const d = (minutesOffset: number) =>
    new Date(seed.getTime() + minutesOffset * 60_000).toISOString();

  const users = [
    {
      id: 'u-student-1',
      name: 'Maya Johnson',
      email: 'maya.johnson@campus.edu',
      role: 'student' as const,
      status: 'active' as const,
      avatarLabel: 'MJ',
      school: 'Northbridge University'
    },
    {
      id: 'u-admin-1',
      name: 'Alex Rivera',
      email: 'alex.rivera@campus.edu',
      role: 'admin' as const,
      status: 'active' as const,
      avatarLabel: 'AR',
      school: 'Northbridge University'
    }
  ];

  const projects: Project[] = [
    {
      id: 'proj-bio-204',
      name: 'Cell Biology',
      description: 'Lecture summaries, pathways, and exam prep notes.',
      courseCode: 'BIO 204',
      ownerUserId: 'u-student-1',
      color: PROJECT_COLORS[0],
      createdAt: d(0),
      updatedAt: d(50)
    }
  ];

  const documents: Document[] = [
    {
      id: 'doc-lecture-3',
      projectId: 'proj-bio-204',
      title: 'Lecture 3',
      kind: 'pdf',
      status: 'ready',
      chunkCount: 38,
      sizeLabel: '6.2 MB',
      createdAt: d(10),
      updatedAt: d(30)
    },
    {
      id: 'doc-slides-8',
      projectId: 'proj-bio-204',
      title: 'Slides',
      kind: 'pptx',
      status: 'ready',
      chunkCount: 24,
      sizeLabel: '3.9 MB',
      createdAt: d(12),
      updatedAt: d(34)
    }
  ];

  const aiChats: AiChat[] = [
    {
      id: 'chat-bio-1',
      projectIds: ['proj-bio-204'],
      title: 'Oxidative phosphorylation review',
      summary: 'ATP synthase and proton gradient recap',
      color: CHAT_COLORS[0],
      messages: [
        {
          id: id('msg'),
          role: 'user',
          content: 'What is oxidative phosphorylation?',
          citations: [],
          createdAt: d(40)
        },
        {
          id: id('msg'),
          role: 'assistant',
          content:
            'It uses the proton gradient across the inner mitochondrial membrane to synthesize ATP via ATP synthase.',
          citations: [
            { id: id('cit'), label: 'Lecture 3', location: 'p.15' },
            { id: id('cit'), label: 'Slides', location: 'slide 8' }
          ],
          createdAt: d(41)
        }
      ],
      createdAt: d(38),
      updatedAt: d(41)
    }
  ];

  return {
    session: {
      signedIn: false,
      activeRole: 'student'
    },
    onboarding: {
      completed: false
    },
    themeMode: 'light',
    users,
    projects,
    documents,
    aiChats,
    developerChat: {
      id: 'dev-chat-1',
      title: 'Developer support',
      accent: '#f97316',
      messages: [
        {
          id: id('dmsg'),
          role: 'developer',
          content:
            'Thanks for testing the mock app. Share bugs or UX pain points here.',
          attachments: [],
          createdAt: d(20)
        }
      ],
      updatedAt: d(20)
    },
    systemErrors: [
      {
        id: id('err'),
        title: 'Upload parser timed out',
        detail:
          'A long PDF parse exceeded the mock timeout threshold. Retry after reducing file size.',
        route: '/projects/proj-bio-204',
        severity: 'warn',
        status: 'open',
        createdAt: d(44)
      }
    ]
  };
}

export function getCurrentUser(state: AppState) {
  const preferredRole = state.session.activeRole;
  const byRole = state.users.find((user) => user.role === preferredRole);
  return byRole ?? state.users[0];
}

export function deriveAdminDashboardData(state: AppState): AdminDashboardData {
  return {
    activeUsers: state.users.filter((user) => user.status === 'active').length,
    totalAiChats: state.aiChats.length,
    totalDeveloperMessages: state.developerChat.messages.length,
    totalProjects: state.projects.length,
    totalDocuments: state.documents.length,
    totalErrors: state.systemErrors.length
  };
}

export function signIn(state: AppState): AppState {
  return {
    ...state,
    session: {
      ...state.session,
      signedIn: true
    }
  };
}

export function signOut(state: AppState): AppState {
  return {
    ...state,
    session: {
      ...state.session,
      signedIn: false
    }
  };
}

export function completeOnboarding(state: AppState): AppState {
  return {
    ...state,
    onboarding: {
      completed: true
    }
  };
}

export function setTheme(state: AppState, theme: ThemeMode): AppState {
  return {
    ...state,
    themeMode: theme
  };
}

export function toggleTheme(state: AppState): AppState {
  return {
    ...state,
    themeMode: state.themeMode === 'light' ? 'dark' : 'light'
  };
}

export function setActiveRole(state: AppState, role: UserRole): AppState {
  return {
    ...state,
    session: {
      ...state.session,
      activeRole: role
    }
  };
}

export function createProject(
  state: AppState,
  input: { name: string; description: string }
): AppState {
  const next = cloneState(state);
  const createdAt = nowIso();
  const project: Project = {
    id: id('proj'),
    name: input.name,
    description: input.description,
    courseCode: inferCourseCode(input.name, next.projects.length + 1),
    ownerUserId: firstStudentId(next),
    color: PROJECT_COLORS[next.projects.length % PROJECT_COLORS.length],
    createdAt,
    updatedAt: createdAt
  };

  next.projects = [project, ...next.projects];
  return next;
}

export function updateProject(
  state: AppState,
  projectId: string,
  input: Partial<{ name: string; description: string; courseCode: string }>
): AppState {
  return {
    ...state,
    projects: state.projects.map((project) =>
      project.id === projectId
        ? {
            ...project,
            ...input,
            updatedAt: nowIso()
          }
        : project
    )
  };
}

export function deleteProject(state: AppState, projectId: string): AppState {
  const projectIds = new Set(
    state.projects.filter((p) => p.id !== projectId).map((p) => p.id)
  );
  const aiChats = state.aiChats.filter((chat) =>
    chat.projectIds.every((idPart) => projectIds.has(idPart))
  );

  return {
    ...state,
    projects: state.projects.filter((project) => project.id !== projectId),
    documents: state.documents.filter(
      (document) => document.projectId !== projectId
    ),
    aiChats
  };
}

export function addDocument(
  state: AppState,
  projectId: string,
  input: {
    title: string;
    kind: DocumentKind;
    sizeLabel?: string;
    status: DocumentStatus;
    noteText?: string;
    chunkCount?: number;
  }
): AppState {
  const createdAt = nowIso();
  const document: Document = {
    id: id('doc'),
    projectId,
    title: input.title,
    kind: input.kind,
    status: input.status,
    sizeLabel: input.sizeLabel,
    noteText: input.noteText,
    chunkCount: input.chunkCount,
    createdAt,
    updatedAt: createdAt
  };

  return {
    ...state,
    documents: [document, ...state.documents],
    projects: state.projects.map((project) =>
      project.id === projectId ? { ...project, updatedAt: createdAt } : project
    )
  };
}

export function updateDocumentStatus(
  state: AppState,
  documentId: string,
  input: {
    status: DocumentStatus;
    chunkCount?: number;
    errorMessage?: string;
  }
): AppState {
  return {
    ...state,
    documents: state.documents.map((document) => {
      if (document.id !== documentId) return document;
      return {
        ...document,
        status: input.status,
        chunkCount: input.chunkCount,
        errorMessage: input.errorMessage,
        updatedAt: nowIso()
      };
    })
  };
}

export function deleteDocument(state: AppState, documentId: string): AppState {
  return {
    ...state,
    documents: state.documents.filter((document) => document.id !== documentId)
  };
}

export function updateNote(
  state: AppState,
  documentId: string,
  input: { title?: string; noteText?: string }
): AppState {
  return {
    ...state,
    documents: state.documents.map((document) => {
      if (document.id !== documentId) return document;
      return {
        ...document,
        ...input,
        updatedAt: nowIso()
      };
    })
  };
}

export function createAiChat(
  state: AppState,
  projectId: string,
  options: { reuseExisting: boolean }
): { state: AppState; chatId: string } {
  if (options.reuseExisting) {
    const existing = state.aiChats.find((chat) =>
      chat.projectIds.includes(projectId)
    );
    if (existing) {
      return { state, chatId: existing.id };
    }
  }

  const createdAt = nowIso();
  const project = state.projects.find((entry) => entry.id === projectId);
  const newChat: AiChat = {
    id: id('chat'),
    projectIds: [projectId],
    title: project ? `${project.courseCode} chat` : 'New study chat',
    summary: 'New conversation',
    color: CHAT_COLORS[state.aiChats.length % CHAT_COLORS.length],
    isGenerating: false,
    messages: [],
    createdAt,
    updatedAt: createdAt
  };

  return {
    state: {
      ...state,
      aiChats: [newChat, ...state.aiChats]
    },
    chatId: newChat.id
  };
}

export function addAiUserMessage(
  state: AppState,
  chatId: string,
  content: string
): AppState {
  const timestamp = nowIso();
  return {
    ...state,
    aiChats: state.aiChats.map((chat) => {
      if (chat.id !== chatId) return chat;
      return {
        ...chat,
        isGenerating: true,
        updatedAt: timestamp,
        messages: [
          ...chat.messages,
          {
            id: id('msg'),
            role: 'user',
            content,
            citations: [],
            createdAt: timestamp
          }
        ]
      };
    })
  };
}

export function addAiAssistantMessage(
  state: AppState,
  chatId: string,
  content: string
): AppState {
  const timestamp = nowIso();
  return {
    ...state,
    aiChats: state.aiChats.map((chat) => {
      if (chat.id !== chatId) return chat;
      const projectId = chat.projectIds[0];
      const citationSources = state.documents
        .filter((doc) => doc.projectId === projectId && doc.status === 'ready')
        .slice(0, 2)
        .map((doc) => ({
          id: id('cit'),
          label: doc.title,
          location:
            doc.kind === 'pdf'
              ? 'p.1'
              : doc.kind === 'pptx'
                ? 'slide 1'
                : undefined
        }));

      return {
        ...chat,
        isGenerating: false,
        summary: content,
        updatedAt: timestamp,
        messages: [
          ...chat.messages,
          {
            id: id('msg'),
            role: 'assistant',
            content,
            citations: citationSources,
            createdAt: timestamp
          }
        ]
      };
    })
  };
}

export function sendDeveloperMessage(
  state: AppState,
  input: { content: string; attachments: DeveloperAttachment[] }
): AppState {
  const timestamp = nowIso();
  return {
    ...state,
    developerChat: {
      ...state.developerChat,
      updatedAt: timestamp,
      messages: [
        ...state.developerChat.messages,
        {
          id: id('dmsg'),
          role: 'user',
          content: input.content,
          attachments: input.attachments,
          createdAt: timestamp
        }
      ]
    }
  };
}

export function addDeveloperReply(state: AppState, reply: string): AppState {
  const timestamp = nowIso();
  return {
    ...state,
    developerChat: {
      ...state.developerChat,
      updatedAt: timestamp,
      messages: [
        ...state.developerChat.messages,
        {
          id: id('dmsg'),
          role: 'developer',
          content: reply,
          attachments: [],
          createdAt: timestamp
        }
      ]
    }
  };
}
