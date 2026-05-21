# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=24-alpine

# Base 
FROM node:${NODE_VERSION} AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Build 
# Full install (incl. devDependencies), build shared + backend,
# then `pnpm deploy` to bundle a self-contained prod subset.
FROM base AS build

# better-sqlite3 is a native module — compiles C++ at install time.
# python3 + make + g++ are required; node-gyp drives the build.
# We do this in the build stage only; the runner stage stays clean.
RUN apk add --no-cache python3 make g++

WORKDIR /usr/src/app

# Copy everything (.dockerignore filters out node_modules, dist, .env, etc.)
COPY . .

# BuildKit cache mount: pnpm store is shared across builds so fast rebuilds.
# --frozen-lockfile fails if pnpm-lock.yaml would change. Reproducible installs.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

RUN pnpm --filter @KiwiClient/shared build
RUN pnpm --filter backend build

# `pnpm deploy` (workspaces) copies the backend package + its prod deps + the
# built shared package into /prod/backend as a standalone, hoisted node_modules.
# Result: a runnable directory with no monorepo plumbing and no devDeps.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm --filter backend deploy --prod /prod/backend --legacy

# Runner 
# Must match the build stage's libc (musl/alpine) so the better-sqlite3
# .node binary compiled above can be dlopen'd here.
FROM node:${NODE_VERSION} AS runner

# tini is a tiny init that reaps zombie processes and forwards signals
# (SIGTERM on `docker stop`). Node as PID 1 does neither well.
RUN apk add --no-cache tini

RUN addgroup -g 7777 kiwiclient && adduser -D -u 7777 -G kiwiclient kiwiclient

WORKDIR /app
COPY --from=build --chown=7777:7777 /prod/backend ./

USER kiwiclient

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

# Injected by CI: `docker build --build-arg GIT_COMMIT=$(git rev-parse --short HEAD)`
# The health endpoint reads process.env.GIT_COMMIT to report which build is live.
# ARG GIT_COMMIT=dev
ENV GIT_COMMIT=prod

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]
