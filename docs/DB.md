## 1. Database Schema

### Overview

```
auth tables (BetterAuth-managed)
  user ──────────────────────────────────────────┐
  session (per device login)                     │
  account (Google OAuth link)                    │
  verification (email tokens)                    │
                                                 │ user.id referenced by:
our tables                                       │
  projects ←─────────────────────────── user_id ─┘
    │  (has color)
    ├── documents ←── project_id
    │       │
    │       └── document_chunks ←── document_id, project_id
    │
    └── chats ←── project_id, user_id   (one project → many chats)
          │  (color copied from project at creation)
          └── messages ←── chat_id

  system_errors (standalone — optional user_id FK)
```

---

### BetterAuth Tables (auto-created by BetterAuth)

```sql
-- Managed by BetterAuth — do NOT manually edit
CREATE TABLE "user" (
    id          TEXT PRIMARY KEY,             -- BetterAuth uses string IDs
    name        TEXT NOT NULL,
    email       TEXT NOT NULL UNIQUE,
    emailVerified BOOLEAN NOT NULL DEFAULT false,
    image       TEXT,                         -- avatar URL from OAuth
    role        TEXT NOT NULL DEFAULT 'user', -- extended field: 'user' | 'admin'
    is_active   BOOLEAN NOT NULL DEFAULT true,-- extended field
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE session (
    id          TEXT PRIMARY KEY,
    expires_at  TIMESTAMPTZ NOT NULL,
    token       TEXT NOT NULL UNIQUE,
    ip_address  TEXT,
    user_agent  TEXT,
    user_id     TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE account (
    id                    TEXT PRIMARY KEY,
    account_id            TEXT NOT NULL,      -- Google sub ID
    provider_id           TEXT NOT NULL,      -- 'google', 'github'
    user_id               TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    access_token          TEXT,
    refresh_token         TEXT,
    access_token_expires_at TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE verification (
    id          TEXT PRIMARY KEY,
    identifier  TEXT NOT NULL,               -- email address
    value       TEXT NOT NULL,               -- token
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### Our Application Tables

```sql
-- Projects: each user can have up to 10
-- color = hex string picked by user, e.g. '#3B82F6'
-- default palette: 10 preset colors; user picks one on create/edit
CREATE TABLE projects (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    description TEXT,
    color       TEXT NOT NULL DEFAULT '#6366F1',  -- indigo default
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_projects_user_id ON projects(user_id);
```

```sql
-- Documents: uploaded files and manual text notes
-- file_type = 'pdf' | 'pptx' | 'txt' | 'note'
-- status    = 'pending' | 'processing' | 'ready' | 'error'
CREATE TABLE documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    file_name       TEXT NOT NULL,
    file_type       TEXT NOT NULL,
    file_size_bytes BIGINT,                  -- NULL for 'note' type
    storage_path    TEXT,                    -- R2 object key; NULL for 'note' type
    raw_text        TEXT,                    -- stored directly for 'note' type only
    chunk_count     INTEGER NOT NULL DEFAULT 0,
    status          TEXT NOT NULL DEFAULT 'pending',
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_project_id ON documents(project_id);
CREATE INDEX idx_documents_status     ON documents(status);
```

```sql
-- Document chunks: the actual text pieces stored as vectors
-- embedding dimension = 256 (Phase 1) or 768 (Phase 2)
CREATE TABLE document_chunks (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id  UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    chunk_index  INTEGER NOT NULL,           -- order within the document
    content      TEXT NOT NULL,             -- the actual text
    page_number  INTEGER,                   -- PDF page or PPTX slide (NULL for TXT/notes)
    token_count  INTEGER,
    embedding    vector(768),               -- change to vector(256) in Phase 1
    metadata     JSONB NOT NULL DEFAULT '{}',
    -- metadata keys: { "section": "3.2", "has_image": true, "highlight_span": "..." }
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- IVFFlat index for approximate nearest neighbor search
-- lists = sqrt(total_vectors); recalculate when vector count grows significantly
CREATE INDEX idx_chunks_embedding ON document_chunks
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_chunks_document_id ON document_chunks(document_id);
CREATE INDEX idx_chunks_project_id  ON document_chunks(project_id);
```

```sql
-- Chats: one chat belongs to exactly one project (one-to-many)
-- color is copied from the parent project at creation time and never changes,
-- so the chat keeps its color even if the project color is later updated.
CREATE TABLE chats (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    color      TEXT NOT NULL,               -- copied from projects.color at INSERT
    title      TEXT,                        -- NULL until auto-generated from first message
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chats_user_id    ON chats(user_id);
CREATE INDEX idx_chats_project_id ON chats(project_id);
```

```sql
-- Messages: every turn in a chat
-- role    = 'user' | 'assistant' | 'system'
-- sources = array of retrieved chunks used to generate this response
CREATE TABLE messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id     UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    role        TEXT NOT NULL,
    content     TEXT NOT NULL,
    sources     JSONB NOT NULL DEFAULT '[]',
    -- sources shape: [{ chunk_id, document_id, document_name, page_number, excerpt }]
    token_count INTEGER,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_chat_id ON messages(chat_id);
```

```sql
-- System errors: logged by the backend, visible in admin panel
CREATE TABLE system_errors (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       TEXT REFERENCES "user"(id) ON DELETE SET NULL,
    error_type    TEXT NOT NULL,            -- e.g. 'embedding_failed', 'llm_timeout'
    error_message TEXT NOT NULL,
    stack_trace   TEXT,
    context       JSONB NOT NULL DEFAULT '{}',
    -- context keys: { endpoint, request_id, document_id, provider_tried, ... }
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_errors_created_at  ON system_errors(created_at DESC);
CREATE INDEX idx_errors_error_type  ON system_errors(error_type);
```

---

### Key Relationships (summary)

| Child table       | FK            | Parent      | On delete |
| ----------------- | ------------- | ----------- | --------- |
| `session`         | `user_id`     | `user`      | CASCADE   |
| `account`         | `user_id`     | `user`      | CASCADE   |
| `projects`        | `user_id`     | `user`      | CASCADE   |
| `documents`       | `project_id`  | `projects`  | CASCADE   |
| `document_chunks` | `document_id` | `documents` | CASCADE   |
| `document_chunks` | `project_id`  | `projects`  | CASCADE   |
| `chats`           | `user_id`     | `user`      | CASCADE   |
| `chats`           | `project_id`  | `projects`  | CASCADE   |
| `messages`        | `chat_id`     | `chats`     | CASCADE   |
| `system_errors`   | `user_id`     | `user`      | SET NULL  |

Deleting a user cascades to everything. Deleting a project cascades to its documents, chunks, and all chats within it. Deleting a document cascades to all its chunks.

---

### Business Rules Enforced at API Level

| Rule                                 | Where enforced                                         |
| ------------------------------------ | ------------------------------------------------------ |
| Max 10 projects per user             | `POST /api/projects` — count check before insert       |
| Max 50 files per project             | `POST /api/projects/:id/documents` — count check       |
| Max 100 notes per project            | `POST /api/projects/:id/notes` — count check           |
| Max file size 20MB                   | Client-side + backend validation                       |
| Max storage 500MB per user           | Backend: sum of `file_size_bytes` for user's documents |
| Only `pdf`, `pptx`, `txt` uploads    | Client + backend MIME/extension check                  |
| Admin-only routes                    | FastAPI middleware: `require_role("admin")`            |
| Users can only access their own data | All queries filter by `user_id` from session           |

---

### Notes on the `sources` JSONB Column

The `messages.sources` column stores which document chunks were retrieved to generate the assistant's reply:

```json
[
  {
    "chunk_id": "uuid",
    "document_id": "uuid",
    "document_name": "Biochemistry_Lecture5.pdf",
    "file_type": "pdf",
    "page_number": 15,
    "excerpt": "Oxidative phosphorylation occurs in the inner mitochondrial membrane..."
  },
  {
    "chunk_id": "uuid",
    "document_id": "uuid",
    "document_name": "CellBio.pptx",
    "file_type": "pptx",
    "page_number": 8,
    "excerpt": "ATP synthesis pathway diagram"
  }
]
```

The frontend renders this as clickable citations. The `page_number` drives the PDF/PPT viewer to the correct page.
