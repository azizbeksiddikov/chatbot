# Deployment Phases

## Design Principle: Every component must be swappable with a config change, not a code rewrite.

---

## Phase 1: Free ($0/mo) — Development & Early Users (0-50 users)

```
Vercel (free)
  └── Next.js frontend + NextAuth.js

Render (free)
  └── FastAPI backend (sleeps after 15min, 30-60s cold start)

Neon Postgres (free)
  └── PostgreSQL + pgvector (512MB limit)

Cloudflare R2 (free)
  └── File storage (10GB)

Free API tiers
  ├── Gemini 2.5 Flash (LLM + Vision + Embeddings)
  ├── Groq, Cerebras, Mistral (LLM fallbacks)
  └── Voyage AI (Embedding fallback)
```

**Limitations:**
- Backend cold starts (30-60s after 15min idle)
- 512MB database (enough for ~50-60 users)
- 10GB file storage (enough for ~50 users at 200MB each)

**Good for:** Building, testing, demo, first 50 beta users.

---

## Phase 2: Production ($5/mo) — Real Users (50-300+ users)

```
Vercel (free)                    ← NO CHANGE
  └── Next.js frontend + NextAuth.js

Hetzner VPS CX22 (~$5/mo)       ← REPLACES Render + Neon
  ├── FastAPI backend (Docker)
  ├── PostgreSQL + pgvector (Docker)
  └── Nginx + Let's Encrypt SSL

Cloudflare R2 (free → ~$1/mo)   ← NO CHANGE, just grows
  └── File storage

Free API tiers                   ← NO CHANGE
  └── Same LLM/Embedding providers
```

**What changes:** Only the backend and database move from managed free services to a VPS.
**What stays the same:** Frontend, file storage, auth, LLM providers, all application code.

---

## Migration Path: Phase 1 → Phase 2

### What makes the switch easy:

1. **Backend code is identical** — same FastAPI app, same Docker image. On Render it runs as a web service; on VPS it runs as a Docker container. Zero code changes.

2. **Database migration is one command:**
   ```bash
   # Export from Neon
   pg_dump $NEON_DATABASE_URL > backup.sql
   
   # Import to VPS Postgres
   psql -h localhost -U postgres chatbot < backup.sql
   ```

3. **Frontend just changes one env var:**
   ```
   # Before (Phase 1)
   NEXT_PUBLIC_API_URL=https://chatbot-api.onrender.com
   
   # After (Phase 2)
   NEXT_PUBLIC_API_URL=https://api.yourdomain.com
   ```

4. **R2 stays exactly the same** — no file migration needed.

5. **Auth stays exactly the same** — NextAuth.js runs on Vercel in both phases.

### Migration checklist:
- [ ] Provision Hetzner VPS
- [ ] Install Docker + Docker Compose
- [ ] Set up Nginx + Let's Encrypt (SSL)
- [ ] pg_dump from Neon → pg restore on VPS
- [ ] Deploy FastAPI container on VPS
- [ ] Update `NEXT_PUBLIC_API_URL` on Vercel
- [ ] Verify everything works
- [ ] Done. ~1 hour of work.

---

## Phase 3: Scale (if needed, $10-20/mo) — 500+ users

If the project grows beyond 300 users:

```
Vercel (free)                      ← NO CHANGE
  └── Frontend

Hetzner VPS CX32 (~$8/mo)         ← UPGRADE: 3 vCPU, 8GB RAM, 80GB SSD
  ├── FastAPI backend
  ├── PostgreSQL + pgvector
  └── Redis (response caching)

Cloudflare R2 (~$2-5/mo)          ← just grows
  └── Files

Paid API tiers (if free runs out)  ← only if needed
  └── Gemini / Groq / Mistral paid plans
```

---

## Architectural Decisions That Enable Easy Migration

### 1. Environment-based configuration

All external services are configured via environment variables:

```env
# Database — change this one line to switch from Neon to VPS Postgres
DATABASE_URL=postgresql://user:pass@host:5432/chatbot

# File storage — same R2 in all phases
R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com
R2_ACCESS_KEY=...
R2_SECRET_KEY=...
R2_BUCKET=chatbot-files

# LLM providers — add/remove/reorder as needed
LLM_PROVIDERS=gemini,groq,cerebras,mistral
GEMINI_API_KEY=...
GROQ_API_KEY=...
CEREBRAS_API_KEY=...
MISTRAL_API_KEY=...

# Embedding — switch provider by changing one line
EMBEDDING_PROVIDER=gemini          # or: voyage, local
EMBEDDING_MODEL=text-embedding-004
VOYAGE_API_KEY=...                 # only needed if EMBEDDING_PROVIDER=voyage

# Auth (NextAuth.js)
NEXTAUTH_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...               # add when ready
GITHUB_CLIENT_SECRET=...
```

### 2. LLM Router pattern

The backend has a provider-agnostic LLM router:

```python
# Simplified concept — the actual code will be in apps/api/src/rag/generator.py

class LLMRouter:
    """Tries providers in order. Falls back on rate limit or error."""
    
    providers = [
        GeminiProvider(),    # Primary
        GroqProvider(),      # Fallback 1
        CerebrasProvider(),  # Fallback 2
        MistralProvider(),   # Fallback 3
    ]
    
    async def generate(self, prompt, stream=True):
        for provider in self.providers:
            try:
                return await provider.generate(prompt, stream=stream)
            except RateLimitError:
                continue  # try next provider
        raise AllProvidersExhaustedError()
```

Adding a new provider = one new class + add to the list. No other code changes.

### 3. Embedding abstraction

```python
# Same pattern for embeddings
class EmbeddingRouter:
    """Switch embedding provider via config."""
    
    def get_provider(self):
        match settings.EMBEDDING_PROVIDER:
            case "gemini":  return GeminiEmbedder()
            case "voyage":  return VoyageEmbedder()
            case "local":   return LocalEmbedder()  # sentence-transformers
```

**IMPORTANT**: Switching embedding providers requires re-embedding all documents (different models produce different vector spaces). The system includes a `re-index` management command for this.

### 4. Docker Compose for both local dev and production

```yaml
# Same docker-compose.yml works locally AND on VPS
services:
  api:
    build: ./apps/api
    env_file: .env
    ports: ["8000:8000"]
  
  db:
    image: pgvector/pgvector:pg16
    volumes: ["pgdata:/var/lib/postgresql/data"]
    ports: ["5432:5432"]
```

On Render (Phase 1): only the `api` service runs; DB is Neon (external).
On VPS (Phase 2): both `api` and `db` run together.
