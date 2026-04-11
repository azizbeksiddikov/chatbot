# Development Steps

One monorepo (`apps/api` + `apps/web`). Build in order — each step produces something runnable before moving on.

---

## Step 1 — Scaffold

Set up the skeleton. Nothing works yet, but everything is wired.

- [ ] Monorepo folder structure (`apps/api`, `apps/web`, `infra/`, `docs/`)
- [ ] `docker-compose.yml`: FastAPI + PostgreSQL + pgvector containers
- [ ] FastAPI app factory + `/health` endpoint
- [ ] Next.js 16 + Tailwind CSS + shadcn/ui installed
- [ ] `.env.example` with every variable the app will ever need
- [ ] Alembic configured (no migrations yet)
- [ ] `README.md`: how to run locally

**Done when:** `docker compose up` starts both services, `/health` returns 200, Next.js loads in browser.

---

## Step 2 — Database

Define all tables once, upfront.

- [ ] All SQLAlchemy models: `user`, `projects`, `documents`, `document_chunks`, `chats`, `messages`, `system_errors`
- [ ] Single Alembic migration with all tables + indexes
- [ ] pgvector extension enabled in migration
- [ ] `seed.py`: inserts test user + project + sample documents

**Done when:** `alembic upgrade head` runs clean, all tables visible in DB.

---

## Step 3 — Auth

Users can sign in. Every API route is protected.

- [ ] BetterAuth installed on frontend (Google OAuth)
- [ ] Sign-in page (`/`) with "Sign in with Google" button
- [ ] FastAPI middleware: validate BetterAuth session token on every request
- [ ] `GET /api/auth/me` returns current user from session
- [ ] Redirect logic: unauthenticated → `/`, authenticated → `/dashboard`

**Done when:** sign in with Google → land on `/dashboard` (empty). Backend rejects requests without a valid session.

---

## Step 4 — Projects

Core CRUD. The first real feature.

- [ ] API: `GET /api/projects`, `POST /api/projects`, `PUT /api/projects/:id`, `DELETE /api/projects/:id`
- [ ] Enforce max 10 projects per user (server-side)
- [ ] UI: `/dashboard` — project cards (name, color, doc count)
- [ ] UI: "New Project" modal — name + description + color picker (10 preset colors)
- [ ] UI: project card delete with confirm dialog
- [ ] UI: `/projects/:id` — project detail page shell (empty document section)
- [ ] Chats inherit project color at creation (copy `projects.color` → `chats.color`)

**Done when:** create, rename, recolor, and delete projects. Dashboard shows them with correct colors.

---

## Step 5 — Document Ingestion

Upload files, process them, store vectors.

- [ ] API: `POST /api/projects/:id/documents` (multipart file upload)
- [ ] Upload file → Cloudflare R2 (S3-compatible)
- [ ] Text extraction:
  - PDF → PyMuPDF (page-by-page, extract page numbers)
  - PPTX → python-pptx (slide-by-slide, extract slide numbers)
  - TXT → plain read
- [ ] Chunking: ~500 tokens, 50 token overlap, preserve page numbers
- [ ] Embed chunks: Gemini Embedding 2 (`gemini-embedding-2-preview`, 768 dims)
- [ ] Store chunks in `document_chunks` with `page_number` + `embedding`
- [ ] Update `documents.status`: `pending → processing → ready | error`
- [ ] API: `POST /api/projects/:id/notes` — manual text note (same pipeline, no R2)
- [ ] API: `GET /api/projects/:id/documents/:docId` — for status polling
- [ ] API: `DELETE /api/projects/:id/documents/:docId` — deletes R2 file + DB rows
- [ ] API: `GET /api/projects/:id/documents/:docId/download` — signed R2 URL
- [ ] UI: file upload zone (drag & drop, accept `.pdf .pptx .txt`, max 20MB)
- [ ] UI: document cards with status badge (queued / processing / ready / error)
- [ ] UI: frontend polls status every 2s until `ready` or `error`
- [ ] UI: "Add text note" modal

**Done when:** upload a PDF → status goes green → chunk rows appear in DB with embeddings.

---

## Step 6 — Chat & RAG

The core product.

- [ ] API: `POST /api/chats` — creates chat tied to one project (copies project color)
- [ ] API: `GET /api/chats` — list user's chats
- [ ] API: `GET /api/chats/:id` — chat with message history
- [ ] API: `DELETE /api/chats/:id`
- [ ] API: `POST /api/chats/:id/messages` — RAG pipeline:
  - Embed user query (Gemini Embedding 2)
  - Vector search in `document_chunks` (cosine, top-10, filtered by `project_id`)
  - Build prompt: system + retrieved chunks + chat history + question
  - Stream response via SSE (Server-Sent Events)
  - Save message + sources to DB
- [ ] LLM router with fallback chain:
  1. Gemini 2.5 Flash (primary)
  2. Groq — Llama 3.3 70B
  3. Cerebras — Llama 3.3 70B
  4. Mistral Large 3
- [ ] UI: `/chat/:id` — chat interface
  - Message list, scroll to bottom on new message
  - Streaming: tokens appear one by one
  - Source citations below each AI reply (filename + page number)
  - Citation click → document viewer at that page (react-pdf)
- [ ] UI: chat list in sidebar, colored by project color
- [ ] Auto-generate chat title from first message

**Done when:** ask a question about an uploaded PDF, get a streamed answer with clickable page citations.

---

## Step 7 — Admin Panel

Visibility and control for the app owner.

- [ ] FastAPI middleware: `require_role("admin")` on all `/api/admin/*` routes
- [ ] API: `GET /api/admin/stats` — user count, chat count, doc count, error count
- [ ] API: `GET /api/admin/users` + `GET /api/admin/users/:id`
- [ ] API: `PUT /api/admin/users/:id` — toggle `is_active`, change `role`
- [ ] API: `GET /api/admin/conversations` — all chats with transcripts
- [ ] API: `GET /api/admin/errors` — system error log
- [ ] UI: `/admin` — stats cards
- [ ] UI: `/admin/users` — users table with role/status controls
- [ ] UI: `/admin/conversations` — read-only chat transcripts
- [ ] UI: `/admin/errors` — error log with expandable stack traces
- [ ] Middleware: non-admin users hitting `/admin/*` redirect to `/dashboard`

**Done when:** admin user can see all users, read any conversation, view error log.

---

## Step 8 — Deploy

Ship it.

- [ ] Production `docker-compose.yml` (no dev volume mounts, restart policies)
- [ ] `Dockerfile` for FastAPI (multi-stage, non-root user)
- [ ] Nginx config: reverse proxy to FastAPI, SSE streaming support (`proxy_buffering off`)
- [ ] Provision VPS (Digital Ocean or Hetzner CX22)
- [ ] Install Docker + Docker Compose on server
- [ ] SSL via Let's Encrypt (`certbot --nginx`)
- [ ] Set all env vars on server
- [ ] Run `alembic upgrade head` on server
- [ ] Deploy containers: `docker compose up -d`
- [ ] Point Vercel `NEXT_PUBLIC_API_URL` → server domain
- [ ] Automated daily backup: `pg_dump` → Cloudflare R2
- [ ] Test full flow on production

**Done when:** app runs on real domain, HTTPS works, survives a server reboot.

---

## Summary

| Step | What you build     | Runnable output                                    |
| ---- | ------------------ | -------------------------------------------------- |
| 1    | Scaffold           | Health endpoint + blank Next.js page               |
| 2    | Database           | All tables, seeded with test data                  |
| 3    | Auth               | Sign in with Google, protected routes              |
| 4    | Projects           | Create, color, delete projects                     |
| 5    | Document ingestion | Upload PDF → chunks stored in pgvector             |
| 6    | Chat & RAG         | Ask questions, get streamed answers with citations |
| 7    | Admin panel        | User management, error monitoring                  |
| 8    | Deploy             | Live on real domain with HTTPS                     |
