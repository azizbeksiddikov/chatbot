export type ThemeMode = 'light' | 'dark';
export type UserRole = 'student' | 'admin';
export type DocumentStatus = 'ready' | 'processing' | 'error';
export type DocumentKind = 'pdf' | 'pptx' | 'txt' | 'note';
export type SystemErrorSeverity = 'critical' | 'warn' | 'info';
export type SystemErrorStatus = 'open' | 'resolved';

export type DeveloperAttachment = {
  id: string;
  type: 'image' | 'voice';
  name: string;
  previewText: string;
  previewUrl?: string;
  durationLabel?: string;
  sizeLabel?: string;
};

export type Citation = {
  id: string;
  label: string;
  location?: string;
};

export type AiMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: Citation[];
  createdAt: string;
};

export type DeveloperMessage = {
  id: string;
  role: 'user' | 'developer';
  content: string;
  attachments: DeveloperAttachment[];
  createdAt: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'inactive';
  avatarLabel: string;
  school: string;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  courseCode: string;
  ownerUserId: string;
  color: string;
  createdAt: string;
  updatedAt: string;
};

export type Document = {
  id: string;
  projectId: string;
  title: string;
  kind: DocumentKind;
  status: DocumentStatus;
  chunkCount?: number;
  errorMessage?: string;
  sizeLabel?: string;
  noteText?: string;
  createdAt: string;
  updatedAt: string;
};

export type AiChat = {
  id: string;
  projectIds: string[];
  title: string;
  summary: string;
  color: string;
  isGenerating?: boolean;
  messages: AiMessage[];
  createdAt: string;
  updatedAt: string;
};

export type DeveloperChat = {
  id: string;
  title: string;
  accent: string;
  messages: DeveloperMessage[];
  updatedAt: string;
};

export type SystemError = {
  id: string;
  title: string;
  detail: string;
  route: string;
  severity: SystemErrorSeverity;
  status: SystemErrorStatus;
  createdAt: string;
};

export type AppState = {
  session: {
    signedIn: boolean;
    activeRole: UserRole;
  };
  onboarding: {
    completed: boolean;
  };
  themeMode: ThemeMode;
  users: User[];
  projects: Project[];
  documents: Document[];
  aiChats: AiChat[];
  developerChat: DeveloperChat;
  systemErrors: SystemError[];
};

export type AdminDashboardData = {
  activeUsers: number;
  totalAiChats: number;
  totalDeveloperMessages: number;
  totalProjects: number;
  totalDocuments: number;
  totalErrors: number;
};
