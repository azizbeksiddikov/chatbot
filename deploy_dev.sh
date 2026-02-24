#!/bin/bash
# Run dev containers with hot reload (admin + user). Different ports from prod.
set -e

if ! docker info >/dev/null 2>&1; then
    echo "Error: Docker is not running. Start Docker and try again."
    exit 1
fi

if [ ! -f .env.dev ]; then
    echo "Error: .env.dev not found. Copy env.example to .env.dev and configure."
    exit 1
fi

echo "Building and starting dev stack (hot reload)..."
docker compose -f docker-compose.yml -f docker-compose.dev.yml build
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

echo ""
echo "  Admin:  http://localhost:5009/  (and /chatbot_admin/, /api/)"
echo "  User:   http://localhost:5012/  (and /api/)"
echo ""
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f --tail=200
