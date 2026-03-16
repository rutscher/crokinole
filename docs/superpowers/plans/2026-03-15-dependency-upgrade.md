# Full Dependency Upgrade Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade all outdated npm dependencies to latest versions and Node.js runtime from 20 to 22.

**Architecture:** Three sequential upgrade groups ordered from safest to riskiest: patch bumps first, then Node runtime, then ESLint major. Each group is verified with tests and build before committing.

**Tech Stack:** Node.js 22, npm, Next.js 16, ESLint 10, React 19, Prisma 7

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `package.json` | Modify | Version bumps for react, react-dom, shadcn, @types/node, eslint |
| `Dockerfile` | Modify | Node 20 → 22 base image |
| `package-lock.json` | Regenerated | Via `npm install` |

---

## Chunk 1: All Upgrades

### Task 1: Patch upgrades (react, react-dom, shadcn)

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Update patch versions**

Run:
```bash
npm install react@19.2.4 react-dom@19.2.4 shadcn@4.0.8
```

- [ ] **Step 2: Verify tests pass**

Run: `npm test`
Expected: All 31 tests pass

- [ ] **Step 3: Verify build succeeds**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: update react 19.2.4, react-dom 19.2.4, shadcn 4.0.8"
```

### Task 2: Node runtime upgrade (Dockerfile + @types/node)

**Files:**
- Modify: `Dockerfile:1` — change `FROM node:20-alpine AS base` to `FROM node:22-alpine AS base`
- Modify: `package.json` — change `@types/node` from `^20` to `^22`

- [ ] **Step 1: Update @types/node**

Run:
```bash
npm install --save-dev @types/node@^22
```

- [ ] **Step 2: Verify tests pass**

Run: `npm test`
Expected: All 31 tests pass

- [ ] **Step 3: Verify build succeeds**

Run: `npm run build`
Expected: Build succeeds — confirms TypeScript is happy with new Node types

- [ ] **Step 4: Update Dockerfile base image**

In `Dockerfile`, line 1, change:
```dockerfile
FROM node:20-alpine AS base
```
to:
```dockerfile
FROM node:22-alpine AS base
```

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json Dockerfile
git commit -m "chore: upgrade Node.js 20 → 22 (LTS) and @types/node ^22"
```

### Task 3: ESLint major upgrade

**Files:**
- Modify: `package.json` — change `eslint` from `^9` to `^10`

- [ ] **Step 1: Update eslint**

Run:
```bash
npm install --save-dev eslint@^10
```

- [ ] **Step 2: Verify lint passes**

Run: `npm run lint`
Expected: Lint passes with no errors. The existing `eslint.config.mjs` already uses flat config (`defineConfig`, `globalIgnores`), so no config changes needed.

If lint fails: check the error output. Most likely cause would be `eslint-config-next` incompatibility, which research says is not an issue with v16.1.6.

- [ ] **Step 3: Verify tests still pass**

Run: `npm test`
Expected: All 31 tests pass

- [ ] **Step 4: Verify build still succeeds**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: upgrade ESLint 9 → 10"
```

### Task 4: Final verification and deploy

- [ ] **Step 1: Run full verification suite**

Run all three checks:
```bash
npm test && npm run build && npm run lint
```
Expected: All pass

- [ ] **Step 2: Verify package versions**

Run: `npm outdated`
Expected: No outdated packages (or only packages we intentionally skipped)

- [ ] **Step 3: Deploy to Unraid**

Run:
```bash
bash /Users/rob/env/deploy-unraid/deploy.sh crokinole
```
Expected: Deploy succeeds. The Dockerfile now uses `node:22-alpine`, so Docker will pull the new base image on first build. Native modules (better-sqlite3) will be compiled inside the container for the correct architecture.
