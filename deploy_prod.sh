#!/bin/bash
# Run prod containers (admin + user). Your nginx routes to these ports.
set -e

if ! docker info >/dev/null 2>&1; then
    echo "Error: Docker is not running. Start Docker and try again."
    exit 1
fi

if [ ! -f .env ]; then
    echo "Error: .env not found. Copy env.example to .env and configure."
    exit 1
fi

echo "Building and starting production stack..."
docker compose build --no-cache
docker compose up -d

echo ""
echo "Containers up. Point your nginx at:"
echo "  Admin:  http://localhost:5010/  (and /chatbot_admin/, /api/)"
echo "  User:   http://localhost:5011/  (and /api/)"
echo ""
echo "Logs (last 200 lines, then follow): docker compose logs -f --tail=200"
