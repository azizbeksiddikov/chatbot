# Stack Decisions

## Why Each Tool Was Chosen

This document records the reasoning behind every technology choice. All selections optimize for: **free cost, AI-coding friendliness, simplicity**.

---

## Backend: FastAPI (Python)

**Chosen over**: Express.js, Django, NestJS

**Why**:
- Largest AI training corpus of any backend framework — Claude, Copilot, Gemini all produce excellent FastAPI code
- Native async support (critical for calling multiple LLM APIs)
- Pydantic v2 for request/response validation — types make AI-generated code more reliable
- Built-in OpenAPI docs at `/docs` — instant API testing
- Lightweight — no Django-level boilerplate

**Trade-off**: Python is slower than Node.js for I/O, but our bottleneck is LLM API latency, not server performance.

---

## Frontend: Next.js 16 App Router (TypeScript)

**Chosen over**: React + Vite, SvelteKit, Nuxt

**Why**:
- Best AI tooling support (enormous training data)
- App Router = server components by default (faster initial load)
- Built-in API routes if we ever need BFF pattern
- Vercel free tier for deployment
- TypeScript strict mode → better AI code generation

**Trade-off**: App Router has a learning curve, but AI tools handle it well.

---

## Database: PostgreSQL 16 + pgvector

**Chosen over**: Supabase, MongoDB Atlas, ChromaDB, Qdrant, Pinecone, Weaviate

**Why**:
- Single database for everything: relational data + vector search (pgvector extension)
- No storage limits when self-hosted on VPS
- SQL queries for vectors — AI tools already know SQL
- pgvector handles our scale easily (~500K vectors, 300 users)
- Phase 1: Neon managed Postgres (512MB free, pgvector supported)
- Phase 2: Self-hosted on Hetzner VPS (unlimited storage within 40GB SSD)

**Why NOT Supabase**: 500MB DB limit (our vectors alone need ~1.7GB), pauses after 7 days inactivity, only 2 free projects — not viable for 300 users.

**Why NOT dedicated vector DBs (Pinecone, Qdrant)**: Our scale (~500K vectors) is well within pgvector's capabilities. Dedicated DBs add operational complexity and cost without benefit at this scale.

**Trade-off**: Self-hosted means managing backups (automated via pg_dump → R2 daily).

---

## Embeddings: Gemini Embedding 2 Preview (`gemini-embedding-2-preview`)

**Chosen over**: text-embedding-004, OpenAI ada-002, sentence-transformers (local), Cohere, Voyage AI

**Why**:
- **Multimodal**: natively embeds text, images, PDFs — no separate image extraction step
- Free via Gemini API (1500 requests/day)
- Flexible dimensions via Matryoshka learning: 128–3072 (we use 256 in Phase 1, 768 in Phase 2)
- Quality exceeds text-embedding-004
- Same API provider as our LLM = one key, one SDK

**Trade-off**: API dependency. If Google changes pricing, we have multiple fallbacks.

**Fallback chain (all free)**:
1. **Voyage AI** — 200M free tokens (extremely generous, enough for months)
2. **Jina AI** — free tier available, good quality
3. **Mistral Embed** — $0.01/MTok (almost free)
4. **`BAAI/bge-small-en-v1.5`** via sentence-transformers — free, runs locally on VPS

**IMPORTANT**: Switching embedding models requires re-embedding all documents (dimensions may differ). Design the system so the embedding model is configurable and re-indexing is a one-command operation.

---

## LLM: Gemini 2.5 Flash (primary) + multi-provider fallback

**Chosen over**: Gemini 2.0 (poor quality), OpenAI GPT (expensive), Claude API (expensive), Ollama (needs GPU)

**NOTE**: Gemini 2.0 Flash is NOT recommended — quality is poor based on testing. Use **2.5 Flash** or newer.

**Why Gemini 2.5 Flash**:
- Free tier: 1000+ RPD, generous token limits
- Good quality for RAG tasks (much better than 2.0)
- Supports streaming
- Vision/image analysis included (for PDFs/PPTs with diagrams)

**Fallback chain (all free, in priority order)**:

| Priority | Provider | Model | Free Limits | Best For |
|---|---|---|---|---|
| 1 | **Gemini** | 2.5 Flash | 1000+ RPD, 1M+ tok/day | Primary — best balance |
| 2 | **Groq** | Llama 3.3 70B | 1000 RPD, 30 RPM | Speed — fastest inference |
| 3 | **Cerebras** | Llama 3.3 70B | 14,400 RPD, 30 RPM | Capacity — most daily requests |
| 4 | **Mistral** | Mistral Large 3 | 1 req/s, 1B tok/month | Quality — huge monthly quota |

**Combined free capacity**: If Gemini dies, Groq + Cerebras + Mistral alone give us ~16,000+ requests/day — more than enough for 300 students.

**Architecture decision**: Build an LLM gateway/router that:
- Tries providers in priority order
- Automatically falls back on rate limit or error
- Logs which provider served each request (for admin dashboard)
- Makes swapping providers a config change, not a code change

**Is RAG better than just uploading to ChatGPT/Gemini/Claude?**
- **Yes, for this use case**, because:
  - Students get persistent, organized knowledge bases (not ephemeral uploads)
  - Multi-document context across an entire course
  - Cheaper (free tier vs $20/month per student)
  - Source citations pointing to specific document chunks
  - Admin control and monitoring
  - Custom prompts tailored to exam preparation
- **ChatGPT/Gemini advantage**: Better at general reasoning. Our RAG is better at precise, grounded answers from specific materials.

**Trade-off**: Free tier rate limits mean ~100 concurrent users could hit walls. Strategy: LLM router with multi-provider fallback + response caching for common questions.

---

## File Storage: Cloudflare R2

**Chosen over**: Supabase Storage (1GB too tight), AWS S3 (expires), local filesystem

**Why**:
- 10GB free storage (10x Supabase)
- Zero egress fees (download files for free)
- S3-compatible API (drop-in replacement)
- No expiring free tier

**Trade-off**: Another service to manage. But the S3 API compatibility makes it nearly identical code.

---

## Auth: BetterAuth

**Chosen over**: NextAuth.js v5, Supabase Auth, Firebase Auth, Clerk

**Why**:
- Framework-agnostic TypeScript-first auth library (actively developed)
- More features than NextAuth out of the box: 2FA, passkeys, multi-session, magic links, API keys
- Google, GitHub, Discord, Apple, email/password — add providers via config
- Stores sessions in our own Postgres (no external dependency)
- No vendor lock-in, free and open source
- First-class Next.js 16 App Router support

**Trade-off**: Newer than NextAuth so less StackOverflow history, but excellent official docs.

---

## Hosting: Hetzner VPS + Vercel

### Phase 1: Development & Testing (FREE — up to ~50 users)

- Frontend: Vercel (free)
- Backend: Render (free, 30-60s cold starts after 15min idle)
- Database: Neon Postgres + pgvector (512MB free)
- Files: Cloudflare R2 (10GB free)

### Phase 2: Production (~ $5/mo — 300+ users)

- Frontend: Vercel (free)
- Backend + DB: Hetzner VPS CX22 (~$5/mo, 2 vCPU, 4GB RAM, 40GB SSD)
  - FastAPI + PostgreSQL + pgvector in Docker Compose
  - No cold starts, no storage limits within SSD
  - Nginx + Let's Encrypt for SSL
- Files: Cloudflare R2 (10GB free, ~$1/mo beyond)

**Decision**: Start with Phase 1 (free) during development. Switch to Phase 2 when launching to real students.

---

## What We're NOT Using (and why)

| Tool | Why Not |
|---|---|
| **LangChain** | Over-abstracted for a focused chatbot. Direct SDK calls are simpler and AI tools write cleaner code without it |
| **Supabase** | 500MB DB limit, pauses after 7 days, only 2 projects on free tier — can't handle 300 users |
| **MongoDB Atlas** | 512MB limit, same storage problem. Document model is wrong fit for relational user/project data |
| **Gemini 2.0 Flash** | Poor quality based on testing. Use 2.5 Flash instead |
| **Pinecone** | Vendor lock-in, paid beyond free tier, pgvector covers our needs |
| **Redis** | Not needed initially. In-memory caching can wait until we hit performance issues |
| **Celery** | Not needed initially. Sync document processing is fine for our scale. Add later if uploads become slow |
| **Kubernetes** | Way overkill. Docker Compose is sufficient |
| **Terraform** | Not needed for 1-2 servers. Manual setup is fine |
