# Final Design Decisions

> **STATUS: APPROVED (with notes)**

---

## 1. Frontend Hosting ✅

| Decision | **Vercel (free tier)** |
|---|---|
| What it does | Hosts the Next.js frontend + handles auth (BetterAuth) |
| Cost | $0 |
| Notes | Fast global CDN, no cold starts, auto-deploys from Git |

---

## 2. Backend Hosting ⏳ (region TBD)

| Decision | **Phase 1: Render (free) → Phase 2: Hetzner VPS (~$5/mo)** |
|---|---|
| Phase 1 | Render free tier. Cold starts 30-60s after 15min idle. Good for dev/testing (0-50 users) |
| Phase 2 | Hetzner CX22: 2 vCPU, 4GB RAM, 40GB SSD, ~$5/mo. Always on, no limits. |
| Region | **TBD** — eu-central vs Asia (Seoul). Depends on where users are. |
| Migration | Same Docker image, change one URL. ~1 hour work. |
| Railway? | $5/mo minimum, 30-day trial only. Same cost as Hetzner but less control. Not worth it. |
| Pinecone? | Managed vector DB, not needed — pgvector in Postgres handles our scale (500K vectors). |

---

## 3. Database ✅

| Decision | **Phase 1: Neon Postgres (free, 512MB) → Phase 2: Self-hosted PostgreSQL + pgvector on VPS** |
|---|---|
| Vector DB | **pgvector** extension inside PostgreSQL. No separate vector DB needed. |
| Why not Pinecone | pgvector handles 500K vectors fine. Pinecone only needed at millions of vectors. |
| VPS resources | DB needs ~1.5GB disk + ~1-2GB RAM for vectors. Hetzner CX22 (4GB RAM, 40GB SSD) covers this. |
| Migration | `pg_dump` → `pg_restore`. One command. |

### pgvector Resource Usage

```
500K vectors × 768 dims:
  Disk:  ~1.5 GB (vectors) + ~500 MB (text + metadata) = ~2 GB total
  RAM:   ~1-2 GB (index in memory for fast search)
  CPU:   Minimal (vector search is optimized with IVFFlat index)

Hetzner CX22 (2 vCPU, 4GB RAM, 40GB SSD):
  RAM:   4 GB total → 2 GB for Postgres, 1.5 GB for FastAPI, 0.5 GB OS
  Disk:  40 GB total → 2 GB DB, 3 GB Docker/OS, 35 GB free
  Verdict: Comfortable fit ✅
```

---

## 4. Embeddings ✅

| Decision | **Gemini Embedding 2 Preview (`gemini-embedding-2-preview`)** |
|---|---|
| What it does | Converts text/images/PDFs into vectors for similarity search |
| Why this one | Multimodal (text + images + PDFs natively), free tier, flexible dimensions |
| Dimensions | Configurable 128–3072 via `output_dimensionality` parameter |
| Free tier | 1500 requests/day, 5 RPM |
| Paid | $0.20 per 1M tokens |
| Fallback | Voyage AI (200M free tokens), or local sentence-transformers |

---

## 5. LLM (Chat Generation) ✅

| Decision | **Gemini 2.5 Flash (primary) + multi-provider fallback** |
|---|---|
| Primary | Gemini 2.5 Flash — good quality, free tier, streaming |
| Fallback 1 | Groq — Llama 3.3 70B, fastest inference, 1000 RPD free |
| Fallback 2 | Cerebras — Llama 3.3 70B, 14,400 RPD free |
| Fallback 3 | Mistral — Mistral Large 3, 1B tokens/month free |
| Architecture | LLM Router auto-falls-back on rate limit. Config-driven. |
| Cost | $0 (all free tiers) |

---

## 6. File Storage ✅

| Decision | **Cloudflare R2** |
|---|---|
| What it does | Stores uploaded files (PDFs, PPTs, TXT) |
| Free tier | 10GB storage, zero egress fees |
| Beyond free | $0.015/GB/month (75GB = ~$1/mo) |
| API | S3-compatible |
| Max file size | 20MB per upload |

---

## 7. Auth ✅ (CHANGED: BetterAuth)

| Decision | **BetterAuth** |
|---|---|
| Why | Framework-agnostic TypeScript auth, more features than NextAuth, active development |
| Day 1 | Google OAuth |
| Later | GitHub, email/password, Discord, Apple, passkeys — add via config |
| Features | 2FA, multi-session, multi-tenancy, passkeys, magic links |
| Database | Uses our Postgres directly (no external dependency) |
| Cost | $0 (open source, self-hosted) |
| Framework support | First-class Next.js support |

---

## 8. Backend Framework ✅

| Decision | **FastAPI (Python)** |
|---|---|
| Why | Best AI/ML ecosystem, Pydantic types, async, largest AI-tool training corpus |
| ORM | SQLAlchemy 2.0 (async) |
| Migrations | Alembic |
| Validation | Pydantic v2 |

---

## 9. Frontend Framework ✅ (UPDATED: Next.js 16)

| Decision | **Next.js 16 App Router (TypeScript strict)** |
|---|---|
| Version | 16.2 (latest stable, released March 2026) |
| Why | Server components, Vercel deployment, Turbopack default, AI dev tools |
| New in 16 | Cache Components, Turbopack stable, View Transitions, Agent DevTools |
| Styling | Tailwind CSS + shadcn/ui |
| State | React Server Components + minimal client state |

---

## 10. Image Analysis ✅ (SIMPLIFIED)

| Decision | **Handled by Gemini Embedding 2 (multimodal)** |
|---|---|
| Approach | Gemini Embedding 2 natively embeds images — no separate Vision step needed for search |
| For display | When showing sources to user, we still extract text from PDFs/PPTs for readable citations |
| Cost | $0 (included in embedding free tier) |

---

## 11. Document Processing ✅ (UPDATED: page-level chunking)

### Input Types

| Type | How it works |
|---|---|
| **PDF upload** | Split by page → chunk each page → embed. Store page numbers. |
| **PPT upload** | Split by slide → chunk each slide → embed. Store slide numbers. |
| **TXT upload** | Chunk by paragraphs → embed |
| **Manual text note** | User types/pastes text → saved in DB → chunk → embed. Editable. |

### Page-Level Source Citations (critical feature)

When the AI answers a question, each source citation includes:

```
Answer: "The mitochondria produces ATP through oxidative phosphorylation..."

Sources:
  [1] Biochemistry_Lecture5.pdf — Page 15
      "Oxidative phosphorylation occurs in the inner mitochondrial membrane..."
      [View page →]  ← opens PDF viewer at page 15

  [2] Cell_Biology.pptx — Slide 8  
      "ATP synthesis pathway diagram"
      [View slide →]  ← opens slide viewer at slide 8
```

### How page tracking works

```
document_chunks table:
  ├── document_id    → which file
  ├── chunk_index    → order within document
  ├── content        → the text
  ├── page_number    → extracted during chunking (PDF page, PPT slide)
  ├── embedding      → vector
  └── metadata       → { "page": 15, "section": "3.2", "has_image": true }

When RAG retrieves chunks:
  1. Return chunk text + page_number + document_id
  2. Frontend builds a link: /projects/:id/documents/:docId?page=15
  3. PDF viewer (react-pdf) opens at that page
  4. Optionally: highlight the matching text passage
```

### Text highlighting approach

```
1. Store the exact text span in the chunk
2. When displaying the source PDF page, search for that text on the page
3. Highlight it using PDF.js text layer highlighting
4. For PPTs: show the slide image with overlaid highlight box
```

---

## 12. Per-User Limits ✅

| Limit | Value | Reason |
|---|---|---|
| Max projects | 10 | Prevent DB bloat |
| Max files per project | 50 | Reasonable for a course |
| Max file size | 20 MB | Prevent abuse |
| Max storage per user | 500 MB | 300 users × 500MB = 150GB max theoretical |
| Max manual notes per project | 100 | Prevent abuse |

---

## 13. Embedding Dimensions ✅

### How it works with Gemini Embedding 2

You choose the dimension when calling the API:

```python
# When embedding a chunk
response = genai.embed_content(
    model="models/gemini-embedding-2-preview",
    content="The mitochondria is...",
    output_dimensionality=768  # YOU choose: 128, 256, 384, 512, 768, 1024, 3072
)
vector = response['embedding']  # → list of 768 floats
```

The model ALWAYS computes a full 3072-dim vector internally, then truncates to your requested size. This is called **Matryoshka Representation Learning** — smaller dimensions are subsets of larger ones, so quality degrades gracefully.

### What this means for us

- **The dimension is OUR choice, not Gemini's default**
- We set it in our config: `EMBEDDING_DIMENSIONS=768`
- Changing it later requires re-embedding all documents (automated via management command)
- The DB column must match: `embedding vector(768)`

### Recommendation

| Phase | Dimensions | DB per 300 users | Quality | Why |
|---|---|---|---|---|
| Phase 1 (Neon 512MB) | **256** | ~500 MB | Good (90%+ of max) | Fits in free tier |
| Phase 2 (VPS) | **768** | ~1.5 GB | Very good (97%+ of max) | Best balance |

Start at 256, upgrade to 768 when moving to VPS. One config change + re-index command.

---

## Summary: Approved Stack

```
┌───────────────────────────────────────────────────┐
│ FRONTEND: Next.js 16 + BetterAuth (Vercel, free)  │
└────────────────────┬──────────────────────────────┘
                     │
┌────────────────────▼──────────────────────────────┐
│ BACKEND: FastAPI (Render free → Hetzner $5)       │
│                                                    │
│  PostgreSQL 16 + pgvector (Neon free → VPS)       │
└──────┬─────────────────┬──────────────────────────┘
       │                 │
┌──────▼──────┐  ┌──────▼──────────────────────────┐
│ Cloudflare  │  │ AI APIs (all free)               │
│ R2 (files)  │  │                                  │
│ 10GB free   │  │ LLM: Gemini 2.5 Flash           │
└─────────────┘  │      → Groq → Cerebras → Mistral│
                 │                                  │
                 │ Embed: Gemini Embedding 2        │
                 │        → Voyage AI (fallback)    │
                 └──────────────────────────────────┘

Phase 1: $0/mo (0-50 users)
Phase 2: ~$5/mo (50-300+ users)
```

---

## Still TBD

- [ ] **Region**: eu-central vs Seoul — depends on where users are located
