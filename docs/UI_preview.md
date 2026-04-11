# UI, User Flows & Database Reference

One document covering how users move through the app, what every page does, and how the database is structured.

---

## Table of Contents

1. [User Flows](#1-user-flows)
2. [Pages & UI Logic](#2-pages--ui-logic)
3. [Database Schema](#3-database-schema)

---

## 1. User Flows

### 1.1 New User — First Visit

```
Landing page (/)
  │
  ├── Click "Sign in with Google"
  │       │
  │       ▼
  │   Google OAuth (BetterAuth handles redirect)
  │       │
  │       ▼
  │   BetterAuth creates: user row + account row + session cookie
  │       │
  │       ▼
  │   Redirect → /dashboard  ← first time: empty state ("Create your first project")
  │
  └── Already has session cookie → redirect straight to /dashboard
```

### 1.2 Create a Project & Upload Documents

```
/dashboard
  │
  ├── Click "New Project"
  │       │
  │       ▼
  │   Modal: enter name + description (optional)
  │       │
  │       ▼
  │   POST /api/projects → creates project row → redirect to /projects/:id
  │
/projects/:id  (empty — no documents yet)
  │
  ├── Click "Upload files" (drag & drop or file picker)
  │       │
  │       ▼
  │   Client validates: type (pdf/pptx/txt), size (max 20MB)
  │       │
  │       ▼
  │   POST /api/projects/:id/documents (multipart)
  │       │
  │       ├── Backend: upload file → Cloudflare R2
  │       ├── Backend: extract text (PyMuPDF / python-pptx / plain read)
  │       ├── Backend: chunk text (~500 tokens, 50 overlap)
  │       ├── Backend: embed chunks (Gemini Embedding 2)
  │       └── Backend: store chunks in document_chunks → status = "ready"
  │       │
  │       ▼
  │   File card shows spinner while status = "processing"
  │   Polls GET /api/projects/:id/documents/:docId every 2s until "ready"
  │       │
  │       ▼
  │   Card updates: "Ready — 42 chunks"
  │
  └── Click "Add text note"
          │
          ▼
      Modal: paste/type text + give it a title
          │
          ▼
      POST /api/projects/:id/notes → same pipeline (chunk → embed → store)
```

### 1.3 Chat with a Project

```
/projects/:id
  │
  └── Click "Start Chat"
          │
          ▼
      POST /api/chats  { project_ids: [":id"] }
      → creates chat row + chat_projects row
      → redirect to /chat/:chatId
          │
          ▼
/chat/:chatId
  │
  ├── User types message → click Send (or Enter)
  │       │
  │       ▼
  │   POST /api/chats/:id/messages  { content: "..." }
  │       │
  │       ├── Embed query (Gemini Embedding 2)
  │       ├── Vector search in document_chunks (cosine, top-10, filtered by project_ids)
  │       ├── Build prompt: system + retrieved chunks + chat history + user question
  │       ├── Stream response from Gemini 2.5 Flash (SSE)
  │       └── Save message + sources to DB
  │       │
  │       ▼
  │   Assistant reply streams into the chat bubble token by token
  │   Below reply: source citations (filename, page number, excerpt)
  │       │
  │       ▼
  │   Click citation → opens document viewer at that page
  │
  └── Click "+ Add knowledge base" → modal to attach more projects to this chat
          POST /api/chats/:id/projects  { project_id: "..." }
```

### 1.4 Manage Documents

```
/projects/:id
  │
  ├── Click document card → expand: shows chunk count, file size, status, upload date
  │
  ├── Click "Download" → GET /api/projects/:id/documents/:docId/download
  │                       → signed R2 URL (expires in 1h)
  │
  ├── Click "Edit" (text notes only)
  │       │
  │       ▼
  │   Modal with editable textarea (pre-filled with note text)
  │       │
  │       ▼
  │   PUT /api/projects/:id/documents/:docId
  │   → deletes old chunks → re-chunks → re-embeds → stores new chunks
  │
  └── Click "Delete" → confirm dialog
          │
          ▼
      DELETE /api/projects/:id/documents/:docId
      → deletes R2 file + document row + all document_chunks (CASCADE)
```

### 1.5 Admin Flow

```
Admin user visits /admin
  │
  ├── /admin                → stats overview (users, chats, documents, errors)
  ├── /admin/users          → table of all users; click row → /admin/users/:id
  │       └── /admin/users/:id  → usage detail, can toggle role/status
  ├── /admin/conversations  → paginated list of all chats; click → read transcript
  └── /admin/errors         → system error log with stack traces
```

---

## 2. Pages & UI Logic

### Route Map

| Route                  | Auth       | Description                                      |
| ---------------------- | ---------- | ------------------------------------------------ |
| `/`                    | Public     | Landing + "Sign in with Google" button           |
| `/dashboard`           | Required   | User's project list + "New Project" button       |
| `/projects/[id]`       | Required   | Project detail: document list, upload, chat      |
| `/projects/[id]/chat`  | Required   | Alias — creates new chat for this project        |
| `/chat/[id]`           | Required   | Chat interface (one chat, multi-project context) |
| `/admin`               | Admin only | Stats dashboard                                  |
| `/admin/users`         | Admin only | All users table                                  |
| `/admin/users/[id]`    | Admin only | User detail + usage                              |
| `/admin/conversations` | Admin only | All chats browser                                |
| `/admin/errors`        | Admin only | Error log                                        |

---

### `/` — Landing

**What it shows:**

- App name, one-line description
- "Sign in with Google" button (BetterAuth)
- If session already exists → redirect to `/dashboard` immediately (no flash)

**UI logic:**

- No state management needed — server component checks session
- On auth success: BetterAuth sets `__Secure-better-auth.session_token` cookie → redirect

---

### `/dashboard` — Projects List

**What it shows:**

- Grid of project cards (name, doc count, last active)
- "New Project" button → opens modal
- Empty state: illustration + "Create your first project"

**UI logic:**

- Fetches `GET /api/projects` on load (server component, no loading spinner needed)
- "New Project" modal: controlled form (name required, description optional)
- On submit: `POST /api/projects` → optimistic add → redirect to `/projects/:id`
- Project card click → navigate to `/projects/:id`
- Project delete: confirm dialog, then `DELETE /api/projects/:id` → remove from list

**Limits enforced in UI:**

- If user has 10 projects, "New Project" button is disabled + tooltip "Max 10 projects reached"

---

### `/projects/[id]` — Project Detail

**What it shows:**

- Project name + description (editable inline)
- Document list (cards with status badge)
- Upload zone (drag & drop)
- "Add text note" button
- "Start Chat" button

**Document card states:**

| Status       | Badge             | Shows                       |
| ------------ | ----------------- | --------------------------- |
| `pending`    | Gray "Queued"     | Spinner                     |
| `processing` | Blue "Processing" | Spinner + progress hint     |
| `ready`      | Green "Ready"     | Chunk count, file size      |
| `error`      | Red "Error"       | Error message, retry button |

**UI logic:**

- Document upload: `<input type="file" accept=".pdf,.pptx,.txt" multiple>`
- File validation on client before upload (type + size ≤ 20MB)
- After upload, poll `GET /api/projects/:id/documents/:docId` every 2s until `status === "ready"` or `"error"`
- Stop polling on unmount (cleanup in useEffect)
- Text note modal: textarea, no file size limit, but capped at 100 notes per project (enforced server-side; show count "X / 100 notes")

---

### `/chat/[id]` — Chat Interface

**Layout:**

```
┌────────────────────────────────────────────┐
│  [← Back]  Chat title (editable)          │
│  Context: Project A, Project B  [+ Add]    │
├──────────────────────────────────────────  │
│                                            │
│  [User bubble]  What is oxidative...       │
│                                            │
│  [AI bubble]    The process involves...    │
│  ┌─────────────────────────────────────┐   │
│  │ Sources:                            │   │
│  │ [1] Lecture5.pdf — Page 15  [View] │   │
│  │ [2] CellBio.pptx — Slide 8  [View]│   │
│  └─────────────────────────────────────┘   │
│                                            │
├────────────────────────────────────────────┤
│  [Message input...]              [Send →]  │
└────────────────────────────────────────────┘
```

**UI logic:**

- Message list: scroll to bottom on new message
- Streaming: SSE connection to `POST /api/chats/:id/messages`
  - `ReadableStream` on client, append tokens to last bubble as they arrive
  - Show blinking cursor while streaming
  - On stream end: render source citations below the bubble
- Source citation click: navigate to `/projects/:projectId/documents/:docId?page=15`
  - PDF viewer (`react-pdf`) opens at that page
  - PPT: shows slide image
- "Add knowledge base": modal with checkboxes of user's other projects

**Empty state:** "Ask a question about your documents" with suggested prompts

---

### `/admin/*` — Admin Pages

**Access guard:** middleware checks `user.role === "admin"`, else redirect to `/dashboard`

**`/admin`:**

- Cards: Total Users, Active Chats (7d), Documents Processed, Errors (24h)
- Simple server-fetched numbers, no real-time

**`/admin/users`:**

- Table: email, name, role, status, projects count, joined date
- Filters: role, status
- Row click → `/admin/users/:id`
- Actions: toggle `is_active`, change role (user ↔ admin)

**`/admin/conversations`:**

- Table: user email, chat title, message count, last active
- Click → read-only chat transcript view

**`/admin/errors`:**

- Table: timestamp, user, error_type, message
- Expandable rows: show full stack trace
- Filter by error_type
