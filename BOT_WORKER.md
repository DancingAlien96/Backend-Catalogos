# Bot Worker - Extraction Guide

This document explains how to extract the bot runtime (`TelegramBotService` and `startBots.ts`) into a separate service/repository for independent deploy and scaling.

## Goals

- Run bot workers independently from the API backend
- Use the same DB models and Redis session store
- Allow independent CI/CD, scaling and monitoring

## Minimal steps to extract

1. Create a new repo (e.g. `bot-worker`).
2. Copy `src/services/TelegramBotService.ts` and `src/scripts/startBots.ts` into the new repo.
3. Add a minimal `package.json` (dependencies: `telegraf`, `ioredis`, `sequelize` + relevant models or copy the models needed).
4. Add `src/config/redis.ts` from the backend (or use `REDIS_URL`).
5. Add a `Dockerfile` (or use `docker/Dockerfile.bot` as reference).
6. Create CI: unit tests, build and publish Docker image, integration job that uses Redis and a DB service.
7. For production: deploy as a set of workers (K8s Deployment with HPA) and use labels/shards to assign stores to specific workers.

## Tips

- Keep `SessionManager` logic the same (Redis sets for per-store sessions).
- Use queues (Bull) for heavy tasks (OpenAI processing) to avoid blocking the bot process.
- Expose Prometheus metrics (`/metrics`) from the worker for monitoring.

## Migration plan

- Start worker in parallel (pointing to same DB and Redis), enable a small set of stores, verify end-to-end flows.
- Gradually move stores to workers and disable bots in the backend for those stores.
