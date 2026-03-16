# Full Dependency Upgrade — Design Spec

**Goal:** Upgrade all outdated npm dependencies to latest versions, including Node.js runtime from 20 to 22.

## Upgrades

### Group 1: Patch upgrades (zero risk)
- `react` 19.2.3 → 19.2.4
- `react-dom` 19.2.3 → 19.2.4
- `shadcn` 4.0.7 → 4.0.8

### Group 2: Node runtime upgrade
- Dockerfile: `node:20-alpine` → `node:22-alpine`
- `@types/node` ^20 → ^22 (match runtime, not latest @types/node which is 25.x for unreleased Node 25)
- Regenerate `package-lock.json` for native module recompilation (better-sqlite3)

### Group 3: ESLint major upgrade
- `eslint` ^9 → ^10
- Existing `eslint.config.mjs` already uses flat config — ESLint 10's main breaking change (eslintrc removal) is a no-op
- Config file lookup change (starts from linted file's directory) is a no-op for single-project repos
- `eslint-config-next@16.1.6` supports ESLint 10

## Verification

After each group:
- `npm test` — all 31 tests pass
- `npm run build` — production build succeeds (especially after Node upgrade for native modules)
- `npm run lint` — after ESLint upgrade

Final: deploy to Unraid.

## What's NOT changing
- Next.js (16.1.6), Prisma (^7.5.0), TypeScript (^5.9.3), Vitest (^4.1.0)
- No config file changes expected (eslint.config.mjs already uses flat config)

## Files to modify
- `package.json` — version bumps
- `Dockerfile` — `node:20-alpine` → `node:22-alpine`
- `package-lock.json` — regenerated via `npm install`
