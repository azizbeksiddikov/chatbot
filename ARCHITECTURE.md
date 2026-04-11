# Architecture

## System Overview

Multi-tenant RAG chatbot for ~300 university students. Students upload lecture materials, create knowledge bases, and chat with an AI that answers questions grounded in their documents.

## High-Level Diagram

```
┌──────────────────────────────────────────────────────────┐
│                    Frontend (Vercel — free)                │
│                   Next.js App Router + BetterAuth         │
│          (Chat UI, DB Management, Admin Panel)            │
└──────────────────────┬───────────────────────────────────┘
                       │ REST API / SSE (streaming)
┌──────────────────────▼───────────────────────────────────┐
│               Backend API (Hetzner VPS — ~$5/mo)          │
│                        FastAPI                            │
│                                                           │
│  ┌───────────┐  ┌───────────┐  ┌──────────────────────┐  │
│  │   Auth    │  │  Projects │  │    RAG Pipeline      │  │
│  │ Middleware│  │  Service  │  │                      │  │
│  └───────────┘  └───────────┘  │  Ingest → Chunk →   │  │
│                                 │  Embed → Store      │  │
│  ┌───────────┐  ┌───────────┐  │                      │  │
│  │   Chat   │  │  Document │  │  Query → Retrieve → │  │
│  │ Service  │  │  Service  │  │  Rerank → Generate  │  │
│  └───────────┘  └───────────┘  └──────────────────────┘  │
│                                                           │
│  ┌────────────────────────────────┐                       │
│  │  PostgreSQL 16 + pgvector      │                       │
│  │  (users, projects, vectors,    │                       │
│  │   chats, messages, errors)     │                       │
│  └────────────────────────────────┘                       │
└──────────┬──────────────────────┬────────────────────────┘
           │                      │
    ┌──────▼──────┐     ┌────────▼────────┐
    │ Cloudflare  │     │  External APIs   │
    │     R2      │     │                  │
    │  (files)    │     │ Gemini (LLM +    │
    │ 10GB free   │     │  Embeddings +    │
    └─────────────┘     │  Vision)         │
                        │ Groq (fallback)  │
                        └──────────────────┘
```

## Components

### Frontend — `apps/web/`

- **Framework**: Next.js 16 App Router, TypeScript strict mode
- **Styling**: Tailwind CSS + shadcn/ui components
- **State**: React Server Components + minimal client state (zustand or context)
- **Auth**: BetterAuth (multi-provider: Google, GitHub, email — extensible)
- **Chat**: Streaming responses via Server-Sent Events (SSE)

#### Pages

| Route                  | Description                          | Access |
| ---------------------- | ------------------------------------ | ------ |
| `/`                    | Landing / login                      | Public |
| `/dashboard`           | User's projects list                 | Auth   |
| `/projects/[id]`       | Project detail — manage documents    | Auth   |
| `/projects/[id]/chat`  | Chat interface with selected project | Auth   |
| `/chat/[id]`           | Standalone chat (linked to projects) | Auth   |
| `/admin`               | Admin dashboard                      | Admin  |
| `/admin/users`         | User management                      | Admin  |
| `/admin/conversations` | Browse conversations                 | Admin  |
| `/admin/errors`        | System error logs                    | Admin  |

### Backend API — `apps/api/`

- **Framework**: FastAPI + Pydantic v2
- **ORM**: SQLAlchemy 2.0 (async)
- **Migrations**: Alembic
- **Task queue**: None initially (sync processing), add Celery/ARQ later if needed
- **Pattern**: Routes → Services → Repositories → Database

#### Key API Endpoints

```
# Auth (handled by BetterAuth on frontend — these are for token validation)
GET    /api/auth/me               # Current user (validates BetterAuth session token)
# BetterAuth handles OAuth flows on the frontend side:
#   Google, GitHub, Email/Password — add more providers via BetterAuth config

# Projects (each user gets up to 10)
GET    /api/projects              # List user's projects
POST   /api/projects              # Create project
GET    /api/projects/:id          # Get project details
PUT    /api/projects/:id          # Update project
DELETE /api/projects/:id          # Delete project + all docs + vectors

# Documents (within a project — files AND manual text notes)
GET    /api/projects/:id/documents        # List documents
POST   /api/projects/:id/documents        # Upload document(s)
POST   /api/projects/:id/notes            # Create manual text note
GET    /api/projects/:id/documents/:docId # Get document info
PUT    /api/projects/:id/documents/:docId # Edit manual text note (re-chunks + re-embeds)
DELETE /api/projects/:id/documents/:docId # Delete document + vectors
GET    /api/projects/:id/documents/:docId/download  # Download original file

# Chat
GET    /api/chats                         # List user's chats
POST   /api/chats                         # Create new chat (select projects)
GET    /api/chats/:id                     # Get chat with messages
POST   /api/chats/:id/messages            # Send message (SSE streaming response)
DELETE /api/chats/:id                     # Delete chat

# Admin
GET    /api/admin/users                   # List all users
GET    /api/admin/users/:id               # User detail + usage
PUT    /api/admin/users/:id               # Update user (role, status)
GET    /api/admin/conversations            # Browse all conversations
GET    /api/admin/errors                   # System error log
GET    /api/admin/stats                    # Usage statistics
```

### Database Schema (PostgreSQL + pgvector)

```sql
-- Users (managed by BetterAuth)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Projects (max 10 per user)
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Documents (uploaded files AND manual text notes)
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,          -- pdf, pptx, txt, or 'note' for manual text
    file_size_bytes BIGINT,           -- NULL for manual text notes
    storage_path TEXT,                 -- Cloudflare R2 key; NULL for manual notes
    raw_text TEXT,                     -- stored directly for manual text notes
    chunk_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'error')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Document chunks with embeddings
CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    page_number INTEGER,               -- PDF page or PPT slide number (for citations)
    token_count INTEGER,
    embedding vector(768),             -- Gemini Embedding 2 (configurable: 256-3072)
    metadata JSONB DEFAULT '{}',       -- section, has_image, highlight_span, etc.
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for vector similarity search
CREATE INDEX ON document_chunks USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Chats
CREATE TABLE chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Chat-Project link (a chat can use multiple projects as context)
CREATE TABLE chat_projects (
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    PRIMARY KEY (chat_id, project_id)
);

-- Chat messages
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    sources JSONB DEFAULT '[]',        -- retrieved chunks used for this response
    token_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- System error log (for admin)
CREATE TABLE system_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    error_type TEXT NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    context JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### RAG Pipeline

#### Ingestion Flow

```
Input Source
    ├── A) File Upload (PDF, PPTX, TXT)
    │       │
    │       ▼
    │   File Validation (type, max 20MB)
    │       │
    │       ▼
    │   Upload to Cloudflare R2
    │       │
    │       ▼
    │   Extract Text
    │       ├── PDF: PyMuPDF (fitz) + extract embedded images
    │       ├── PPTX: python-pptx + extract slide images
    │       └── TXT: direct read
    │       │
    │       ▼
    └── B) Manual Text Note
            │
            ▼
        Save raw_text in documents table
    │
    ▼  (both paths merge here)
Chunking
    ├── Strategy: recursive text splitting
    ├── Chunk size: ~500 tokens
    ├── Overlap: 50 tokens
    └── Preserve: paragraph/section boundaries
    │
    ▼
Embedding (Gemini Embedding 2 Preview — gemini-embedding-2-preview)
    │
    ▼
Store in pgvector (document_chunks table)
    │
    ▼
Update document status → 'ready'
```

#### Query Flow

```
User Message
    │
    ▼
Embed query (Gemini Embedding 2 Preview)
    │
    ▼
Vector search in pgvector
    ├── Filter by: project_ids from chat_projects
    ├── Similarity: cosine
    ├── Top-k: 5-10 chunks
    └── (Optional) Rerank with cross-encoder
    │
    ▼
Build prompt
    ├── System prompt (instructions, persona)
    ├── Retrieved context (chunks with citations)
    ├── Chat history (last N messages)
    └── User question
    │
    ▼
LLM Generation (Gemini 2.5 Flash)
    ├── Streaming via SSE
    ├── Fallback chain: Groq → Cerebras → Mistral (all free)
    └── Include source citations in response
    │
    ▼
Save message + sources to database
```

### Multi-tenancy & Security

- **Isolation**: All queries filter by `user_id` and `project_id`. No cross-tenant data leakage.
- **Project limit**: Enforced at API level — max 10 projects per user.
- **Auth**: BetterAuth JWT tokens validated on every request via middleware. Supports multiple OAuth providers (Google, GitHub, etc.) — adding a new provider is a config change.
- **Admin**: Role-based access. Admin role grants access to `/admin` routes.
- **Rate limiting**: Per-user rate limits to prevent abuse of LLM APIs.

### External Services

| Service           | Purpose              | Free Tier / Cost                              |
| ----------------- | -------------------- | --------------------------------------------- |
| Hetzner VPS CX22  | Backend + DB hosting | ~$5/mo (2 vCPU, 4GB RAM, 40GB SSD)           |
| Vercel            | Frontend hosting     | Free (hobby tier)                             |
| Cloudflare R2     | File storage         | 10GB free, then $0.015/GB/mo, 0 egress       |
| Google Gemini API | LLM + Embed + Vision | Free: 1000+ RPD, 1M+ tokens/day               |
| Groq              | Fallback LLM #1      | Free: 1000 RPD, 30 RPM                        |
| Cerebras          | Fallback LLM #2      | Free: 14,400 RPD, 30 RPM                      |
| Mistral           | Fallback LLM #3      | Free: 1 req/s, 1B tokens/month                |
| Voyage AI         | Fallback Embeddings   | Free: 200M tokens                              |

### Deployment

**Production setup:**

```
Vercel (free):
  └── Next.js frontend + BetterAuth (Google, GitHub, email — extensible)

Hetzner VPS CX22 (~$5/mo):
  ├── Docker Compose
  │   ├── FastAPI backend container
  │   ├── PostgreSQL 16 + pgvector container
  │   └── Nginx reverse proxy (SSL via Let's Encrypt)
  └── Automated backups (pg_dump → R2, daily)

Cloudflare R2 (free → ~$1/mo at scale):
  └── Uploaded files (PDFs, PPTs, etc.)

LLM Router (all free tiers):
  ├── Primary:    Gemini 2.5 Flash (LLM + Vision + Embeddings)
  ├── Fallback 1: Groq (Llama 3.3 70B — fastest)
  ├── Fallback 2: Cerebras (Llama 3.3 70B — most daily capacity)
  └── Fallback 3: Mistral Large 3 (1B tokens/month)

Embedding:
  ├── Primary:    Gemini Embedding 2 Preview (gemini-embedding-2-preview)
  └── Fallback:   Voyage AI (200M free tokens)
```

**Estimated monthly cost: ~$5** (VPS only, everything else free)

## Directory Structure

```
chatbot/
├── CLAUDE.md                    # AI agent instructions
├── AGENTS.md                    # GitHub Copilot/Codex instructions
├── ARCHITECTURE.md              # This file
├── docker-compose.yml
├── .env.example
│
├── apps/
│   ├── api/                     # FastAPI backend
│   │   ├── pyproject.toml
│   │   ├── alembic.ini
│   │   ├── alembic/             # Database migrations
│   │   ├── src/
│   │   │   ├── __init__.py
│   │   │   ├── main.py          # FastAPI app factory
│   │   │   ├── config.py        # Pydantic settings
│   │   │   ├── dependencies.py  # Shared dependencies (DB session, current user)
│   │   │   ├── models/          # SQLAlchemy models
│   │   │   │   ├── user.py
│   │   │   │   ├── project.py
│   │   │   │   ├── document.py
│   │   │   │   ├── chat.py
│   │   │   │   └── error_log.py
│   │   │   ├── schemas/         # Pydantic request/response schemas
│   │   │   │   ├── user.py
│   │   │   │   ├── project.py
│   │   │   │   ├── document.py
│   │   │   │   └── chat.py
│   │   │   ├── routes/          # API route handlers
│   │   │   │   ├── auth.py
│   │   │   │   ├── projects.py
│   │   │   │   ├── documents.py
│   │   │   │   ├── chats.py
│   │   │   │   └── admin.py
│   │   │   ├── services/        # Business logic
│   │   │   │   ├── auth.py
│   │   │   │   ├── project.py
│   │   │   │   ├── document.py
│   │   │   │   ├── chat.py
│   │   │   │   └── admin.py
│   │   │   ├── repositories/    # Data access
│   │   │   │   ├── base.py
│   │   │   │   ├── user.py
│   │   │   │   ├── project.py
│   │   │   │   ├── document.py
│   │   │   │   └── chat.py
│   │   │   └── rag/             # RAG pipeline
│   │   │       ├── chunker.py       # Text splitting
│   │   │       ├── embedder.py      # Embedding via Gemini API
│   │   │       ├── retriever.py     # Vector search + reranking
│   │   │       ├── generator.py     # LLM generation with fallback
│   │   │       ├── extractor.py     # Text extraction from files
│   │   │       └── prompts.py       # Prompt templates
│   │   └── tests/
│   │       ├── conftest.py
│   │       ├── test_auth.py
│   │       ├── test_projects.py
│   │       ├── test_documents.py
│   │       ├── test_chats.py
│   │       └── test_rag/
│   │
│   └── web/                     # Next.js frontend
│       ├── package.json
│       ├── tsconfig.json
│       ├── tailwind.config.ts
│       ├── next.config.ts
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx              # Landing / login
│       │   │   ├── dashboard/
│       │   │   │   └── page.tsx          # Projects list
│       │   │   ├── projects/
│       │   │   │   └── [id]/
│       │   │   │       ├── page.tsx      # Project detail
│       │   │   │       └── chat/
│       │   │   │           └── page.tsx  # Chat with project
│       │   │   ├── chat/
│       │   │   │   └── [id]/
│       │   │   │       └── page.tsx      # Chat view
│       │   │   └── admin/
│       │   │       ├── page.tsx          # Admin dashboard
│       │   │       ├── users/
│       │   │       ├── conversations/
│       │   │       └── errors/
│       │   ├── components/
│       │   │   ├── ui/                   # shadcn/ui components
│       │   │   ├── chat/
│       │   │   │   ├── chat-input.tsx
│       │   │   │   ├── chat-message.tsx
│       │   │   │   ├── chat-list.tsx
│       │   │   │   └── source-citation.tsx
│       │   │   ├── projects/
│       │   │   │   ├── project-card.tsx
│       │   │   │   └── document-list.tsx
│       │   │   └── admin/
│       │   │       ├── user-table.tsx
│       │   │       └── stats-card.tsx
│       │   ├── lib/
│       │   │   ├── api.ts               # API client (fetch wrapper)
│       │   │   ├── auth.ts              # BetterAuth client config
│       │   │   └── utils.ts
│       │   └── types/
│       │       ├── user.ts
│       │       ├── project.ts
│       │       ├── document.ts
│       │       └── chat.ts
│       └── tests/
│
└── infra/
    ├── docker/
    │   ├── Dockerfile.api
    │   └── Dockerfile.web
    └── scripts/
        ├── setup.sh
        └── seed.sh
```
