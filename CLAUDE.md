# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build (standalone output)
npm test             # Run all tests (vitest)
npm run test:watch   # Tests in watch mode
npm test -- tests/actions/rounds.test.ts  # Run single test file

# Prisma
npx prisma migrate dev --name <name>  # Create migration
npx prisma generate                    # Regenerate client
npx prisma studio                      # DB browser

# Deploy to Unraid
bash /Users/rob/env/deploy-unraid/deploy.sh crokinole
```

## Architecture

Crokinole scorekeeper — mobile-first web app for tracking crokinole game scores. Phone lays flat between two players; screen is split in half with Player 1's half rotated 180° so each player reads their own side.

**Stack:** Next.js 16.1 (App Router), React 19.2, Prisma 7 + SQLite (BetterSQLite3 adapter), Node 22 LTS, shadcn/ui 4 (Base UI), Tailwind 4, ESLint 10, Vitest.

**Data flow:** Server Actions in `src/lib/actions/` handle all DB operations. Game page uses optimistic updates — disc taps update local `useState` instantly with temporary negative IDs, fire server action async, revert on failure. Only `endRound`/`undoRound` use `router.refresh()` for full state sync.

**Prisma 7 adapter pattern:** Uses `@prisma/adapter-better-sqlite3` in both `prisma.config.ts` (migrations) and `src/lib/db.ts` (runtime). The `PrismaClient` constructor requires `as any` cast due to Prisma 7 type alignment issues. The `datasource` block in `schema.prisma` must NOT have a `url` field — Prisma 7 manages the URL via `prisma.config.ts`.

## Key Patterns

- **Server Actions** (`src/lib/actions/`): All use `"use server"` directive. Transactions wrap multi-step operations (endRound, undoRound, createGame).
- **Optimistic updates** (`game-client.tsx`): Local disc state overlays server data. Temp IDs are negative integers. Undo removes last disc for that specific player.
- **Scoring:** Difference-based. Each round, the higher scorer gets `abs(p1Score - p2Score)` added to their game total. First to 100 wins.
- **Hammer:** Last-shot advantage. Auto-alternates each round. Tracked per round in DB.
- **Wake lock:** NoSleep.js (hidden video trick) activated on first user touch, plus native Wake Lock API as bonus. Re-acquired on visibility change.
- **Force-dynamic:** Pages with DB queries use `export const dynamic = "force-dynamic"` to prevent stale static rendering.
- **PWA:** Installable via service worker (`public/sw.js`), web manifest, and iOS meta tags. `ServiceWorkerRegister` component auto-registers in layout. `InstallHint` shows a dismissable banner for non-standalone users on the home page.
- **Game management:** Completed games can be deleted (`deleteGame`) or have scores edited (`updateGameScore`) via dialogs accessible from the game detail exit menu.
- **New game screen:** `NewGameClient` component with `getRecentPlayers` action for quick player selection.

## Testing

- Vitest with `fileParallelism: false` (shared SQLite test DB)
- Test DB: `test.db` (set via `vitest.config.ts` env override, separate from dev `dev.db`)
- `tests/setup.ts`: clears all tables before each test, disconnects after all
- 36 tests across 5 files covering: player CRUD, game creation/deletion/score-edit, disc add/undo, round scoring (ties, game-over), round undo, stats derivation

## Deployment

Docker multi-stage build → Unraid container. SQLite DB persists at `/mnt/user/appdata/crokinole/data/crokinole.db` via volume mount. Container runs migrations on startup (`npx prisma migrate deploy`), then `node server.js`. Port mapping: 3100→3000. Config at `/Users/rob/env/deploy-unraid/configs/crokinole.conf`.

## Data Model

Four tables: **Player** (name, unique), **Game** (two players, scores, status, winner, firstHammer), **Round** (roundNumber, per-player scores, pointsAwarded, hammer, status), **Disc** (playerId, ringValue: 5/10/15/20). Rounds have `status` field ("in_progress"/"completed") not in the original spec — needed for tracking active round.
