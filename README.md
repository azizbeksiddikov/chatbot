# Chatbot (file-search + admin)

File-based search and Q&A chatbot. Upload documents, ask questions, get answers grounded in your files. Includes an admin UI for managing file stores and viewing conversations.

**Demo:** [https://chatbot.azbek.me/](https://chatbot.azbek.me/)

---

## Run locally

Containers only; run nginx (or another proxy) at the top layer and route to the ports below.

| Environment | Admin (host port) | User (host port) |
| ----------- | ----------------- | ---------------- |
| **Prod**    | 5010              | 5011             |
| **Dev**     | 5009              | 5012             |

### Prod

```bash
cp env.example .env   # edit .env with your keys (GEMINI_API_KEY, SECRET_KEY, ADMIN_ID, etc.)
./deploy_prod.sh
```

Point your nginx at `http://localhost:5010` (admin) and `http://localhost:5011` (user chat).

### Dev (hot reload)

```bash
cp env.example .env.dev   # edit .env.dev with your keys
./deploy_dev.sh
```

Point your nginx at `http://localhost:5009` (admin) and `http://localhost:5012` (user chat). Code changes in `admin/src` and `user/backend` / `user/frontend` reload automatically.
