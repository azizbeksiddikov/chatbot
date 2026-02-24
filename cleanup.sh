#!/bin/bash
# Remove all containers and images created for this project (prod + dev).
set -e

echo "Stopping and removing containers (prod)..."
docker compose down --remove-orphans 2>/dev/null || true

echo "Stopping and removing containers (dev)..."
docker compose -f docker-compose.yml -f docker-compose.dev.yml down --remove-orphans 2>/dev/null || true

echo "Removing project images..."
for img in chatbot-admin:latest chatbot-user:latest chatbot-admin:dev chatbot-user:dev; do
  if docker images -q "$img" 2>/dev/null | grep -q .; then
    docker rmi -f "$img" 2>/dev/null || true
  fi
done

echo "Cleanup done. Containers and images for this project have been removed."
