# Environment Keys Reference

This document explains:

- where each environment key comes from,
- how to set it in development and production,
- what happens if it is missing.

## 1) Env File Usage Matrix

| Runtime path                                                                                | Env file used |
| ------------------------------------------------------------------------------------------- | ------------- |
| Docker development (`docker compose up`)                                                    | `.env.dev`    |
| Docker production (`docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d`) | `.env.prod`   |
| Backend without Docker (`uvicorn src.main:app --reload`)                                    | `.env`        |

Notes:

- `.env.example` is the template. Copy it to the correct file for your runtime.
- `.env.dev` and `.env.prod` are gitignored.
- If you run backend without Docker and only created `.env.dev`, your vars will not load automatically unless you export them in your shell.

## 2) Key-by-Key Documentation

## Database

| Key            | Where to get it                                                      | Dev missing behavior                                  | Prod missing behavior |
| -------------- | -------------------------------------------------------------------- | ----------------------------------------------------- | --------------------- |
| `DATABASE_URL` | Local Postgres DSN, or managed DB DSN (Supabase, Railway, Neon, RDS) | API cannot connect to DB; startup or request failures | API unavailable       |

Implementation notes:

- Dev Docker default in template points to the `db` service.
- Prod should use a managed/secured DB URL.

## Auth

| Key                    | Where to get it                                                             | Dev missing behavior                   | Prod missing behavior                               |
| ---------------------- | --------------------------------------------------------------------------- | -------------------------------------- | --------------------------------------------------- |
| `BETTER_AUTH_SECRET`   | Generate with `openssl rand -base64 32`                                     | App may run, but sessions are insecure | Security risk; must be set to a strong random value |
| `BETTER_AUTH_URL`      | Your app base URL (`http://localhost:3000` in dev)                          | Redirect/callback mismatch if wrong    | Login/session flows break if wrong                  |
| `GOOGLE_CLIENT_ID`     | Google Cloud Console > APIs & Services > Credentials > OAuth 2.0 Client IDs | Google login unavailable               | Google login unavailable                            |
| `GOOGLE_CLIENT_SECRET` | Same as above                                                               | Google login unavailable               | Google login unavailable                            |

How to create Google OAuth keys:

1. Create/select a Google Cloud project.
2. Configure OAuth consent screen.
3. Create OAuth Client ID (Web application).
4. Add authorized redirect URIs for dev and prod.

Typical redirect origins:

- Dev: `http://localhost:3000`
- Prod: your real domain

## LLM Providers

| Key                | Where to get it                                | Dev missing behavior                         | Prod missing behavior                               |
| ------------------ | ---------------------------------------------- | -------------------------------------------- | --------------------------------------------------- |
| `GEMINI_API_KEY`   | Google AI Studio or Google Cloud Vertex AI key | Chat requests fail if no provider key exists | Chat unusable without at least one working provider |
| `GROQ_API_KEY`     | Groq Console                                   | Optional fallback unavailable                | Reduced resiliency/capacity                         |
| `CEREBRAS_API_KEY` | Cerebras Cloud account                         | Optional fallback unavailable                | Reduced resiliency/capacity                         |
| `MISTRAL_API_KEY`  | Mistral AI console                             | Optional fallback unavailable                | Reduced resiliency/capacity                         |

Implementation recommendation:

- Treat `GEMINI_API_KEY` as required for current setup.
- Keep at least one fallback provider key in production.

## Embeddings

| Key                    | Where to get it                       | Dev missing behavior                                       | Prod missing behavior               |
| ---------------------- | ------------------------------------- | ---------------------------------------------------------- | ----------------------------------- |
| `EMBEDDING_DIMENSIONS` | Project configuration (default `768`) | If mismatched with vector index schema, retrieval can fail | Same; can break RAG indexing/search |

Implementation notes:

- Keep this consistent with your embedding model and pgvector column size.
- Changing it after data exists may require a migration/reindex.

## Cloudflare R2 Storage

| Key                    | Where to get it                           | Dev missing behavior                                 | Prod missing behavior       |
| ---------------------- | ----------------------------------------- | ---------------------------------------------------- | --------------------------- |
| `R2_ACCOUNT_ID`        | Cloudflare Dashboard > R2                 | Upload-related features fail/disabled                | Upload features fail        |
| `R2_ACCESS_KEY_ID`     | Cloudflare R2 API token credentials       | Upload-related features fail/disabled                | Upload features fail        |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 API token credentials       | Upload-related features fail/disabled                | Upload features fail        |
| `R2_BUCKET_NAME`       | Bucket name you created in R2             | Upload-related features fail if bucket missing/wrong | Upload features fail        |
| `R2_PUBLIC_URL`        | Public/custom domain mapped to the bucket | File URL generation may fail or not be public        | Broken file links/downloads |

How to create R2 keys:

1. Create an R2 bucket.
2. Create API token with bucket access.
3. Save access key ID and secret.
4. Configure public/custom domain if files should be publicly accessible.

## App URLs and CORS

| Key                   | Where to get it                                  | Dev missing behavior                                         | Prod missing behavior                            |
| --------------------- | ------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------ |
| `FRONTEND_URL`        | Your frontend origin                             | Defaults to localhost; may be fine in dev                    | Wrong value can break redirects/integration      |
| `API_URL`             | Your backend base URL                            | Defaults to localhost; may be fine in dev                    | Wrong value breaks frontend-to-API communication |
| `CORS_ORIGINS`        | Comma-separated list of allowed frontend origins | Browser requests can fail with CORS errors if origin missing | Browser clients blocked by CORS                  |
| `NEXT_PUBLIC_API_URL` | Public backend URL for Next.js browser code      | Frontend cannot call API correctly if wrong/missing          | Frontend broken API calls                        |

## 3) No-Key Strategy (Recommended)

For local development:

- Minimum useful setup: `DATABASE_URL` (or Docker default) + `GEMINI_API_KEY`.
- Optional keys can be left empty if you are not testing those features.

For production:

- Must set: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GEMINI_API_KEY`, `FRONTEND_URL`, `API_URL`, `CORS_ORIGINS`.
- Set R2 keys if upload/file features are enabled.

## 4) Security and Operations Notes

- Never commit `.env.dev` or `.env.prod`.
- Rotate provider keys periodically and after any suspected leak.
- Use separate keys for development and production.
- Restrict API keys by domain/IP/provider controls when supported.
- Keep production secrets in a secret manager when possible (not only on disk).
