# RAG Chatbot

AI chatbot for university students. Upload lecture materials (PDFs, PPTs, text notes), create knowledge bases, and chat with an AI that answers questions grounded in your documents — with page-level source citations.

## Environment Files

| File           | Purpose                             | Committed?      |
| -------------- | ----------------------------------- | --------------- |
| `.env.example` | Template with all keys and comments | Yes             |
| `.env.dev`     | Local development secrets           | No (gitignored) |
| `.env.prod`    | Production secrets                  | No (gitignored) |

See [docs/ENV_KEYS.md](docs/ENV_KEYS.md) for where to get each key and what breaks if it's missing.

### Which File Is Used In Dev vs Prod?

| Context                                                                                     | File(s) used                           |
| ------------------------------------------------------------------------------------------- | -------------------------------------- |
| Docker development (`docker compose up`)                                                    | `.env.dev`                             |
| Docker production (`docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d`) | `.env.prod`                            |
| Backend without Docker (`uvicorn src.main:app --reload`)                                    | `.env` (loaded by `pydantic-settings`) |

Important: if you run backend locally without Docker, either create `.env` from `.env.example` or export env vars in your shell. `.env.dev` is not auto-loaded by `pydantic-settings` in that mode.

---

## Development Setup

**1. Create your dev env file:**

```bash
cp .env.example .env.dev
```

Most dev defaults work out of the box. You only need to fill in `GEMINI_API_KEY` to run the chatbot locally.

If you do not provide optional keys, some features are disabled instead of crashing. See [docs/ENV_KEYS.md](docs/ENV_KEYS.md) for a full per-key matrix.

**2. Start all services:**

```bash
docker compose up
```

**3. Open:**

- Frontend: http://localhost:3000
- API: http://localhost:8000
- Health check: http://localhost:8000/health

### Without Docker

**Backend (FastAPI):**

```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
uvicorn src.main:app --reload
```

Requires PostgreSQL + pgvector running on localhost:5432.

For backend env vars in this mode:

```bash
cp .env.example .env
# then fill values (at minimum GEMINI_API_KEY for chat)
```

**Frontend (Next.js):**

```bash
cd apps/web
bun install
bun dev
```

**Tests:**

```bash
cd apps/api
pytest -v
```

---

## Production Setup

**1. Create your prod env file on the server:**

```bash
cp .env.example .env.prod
# Fill in all real values — see docs/ENV_KEYS.md
```

**2. Start with the prod compose override:**

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

The prod override disables hot-reload, enables multiple workers, and sets `restart: unless-stopped` on all services.

**Required for prod (app won't work without these):**

| Key                                         | Why                                                    |
| ------------------------------------------- | ------------------------------------------------------ |
| `DATABASE_URL`                              | Must point to your real DB, not the local container    |
| `BETTER_AUTH_SECRET`                        | Must be a strong random string                         |
| `BETTER_AUTH_URL`                           | Must be your real domain                               |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Login won't work without these                         |
| `GEMINI_API_KEY`                            | Chat won't work without at least one LLM key           |
| `FRONTEND_URL` / `CORS_ORIGINS`             | Must match your real domain or API will block requests |

### No-Key Behavior (Quick Reference)

| Key group                                          | If missing in dev                             | If missing in prod                                  |
| -------------------------------------------------- | --------------------------------------------- | --------------------------------------------------- |
| OAuth (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) | Login is unavailable                          | Login is unavailable (blocking if auth is required) |
| LLM (`GEMINI_API_KEY`, fallbacks)                  | Chat responses fail if no provider key exists | Chat is unusable                                    |
| R2 storage keys                                    | Upload features fail/are disabled             | Upload features fail                                |
| `BETTER_AUTH_SECRET`                               | Insecure; do not use in shared env            | Security risk; must be set                          |

Full details: [docs/ENV_KEYS.md](docs/ENV_KEYS.md)

---

## Tech Stack

- **Backend:** FastAPI, SQLAlchemy 2.0 (async), PostgreSQL + pgvector
- **Frontend:** Next.js 16, Tailwind CSS, shadcn/ui
- **LLM:** Gemini 2.5 Flash with Groq/Cerebras/Mistral fallbacks
- **Auth:** BetterAuth (Google OAuth)
- **Storage:** Cloudflare R2
- **Embeddings:** Gemini Embedding 2

## Project Structure

```
chatbot/
├── apps/
│   ├── api/          # FastAPI backend
│   │   ├── src/      # Application source
│   │   ├── alembic/  # Database migrations
│   │   └── tests/    # API tests
│   └── web/          # Next.js frontend
│       └── src/      # Application source
├── docs/             # Architecture & design docs
│   └── ENV_KEYS.md   # How to get each env key
├── plans/            # Development step plans
├── docker-compose.yml
└── docker-compose.prod.yml
```
