# Crokinole Scorekeeper Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first crokinole scorekeeper web app with split-screen gameplay, player roster, and lifetime stats.

**Architecture:** Next.js App Router with server actions persisting every disc tap to SQLite via Prisma. Split-screen UI with rotated halves for each player. Dark theme using shadcn/ui + Tailwind.

**Tech Stack:** Next.js 14+, TypeScript, Prisma, SQLite, shadcn/ui, Tailwind CSS, Vitest

**Spec:** `docs/superpowers/specs/2026-03-14-crokinole-scorekeeper-design.md`

---

## File Structure

```
crokinole/
├── prisma/
│   └── schema.prisma                 # Database schema (Players, Games, Rounds, Discs)
├── src/
│   ├── app/
│   │   ├── layout.tsx                # Root layout (dark theme, Inter font, metadata)
│   │   ├── globals.css               # Tailwind directives + dark theme base
│   │   ├── page.tsx                  # Home screen (new game, players, stats, recent games)
│   │   ├── players/
│   │   │   └── page.tsx              # Player roster management (add/edit/remove)
│   │   ├── game/
│   │   │   ├── new/
│   │   │   │   └── page.tsx          # New game setup (pick players, choose hammer)
│   │   │   └── [id]/
│   │   │       └── page.tsx          # Active game (split-screen scoring)
│   │   └── stats/
│   │       └── page.tsx              # Lifetime stats viewer
│   ├── lib/
│   │   ├── db.ts                     # Prisma client singleton
│   │   └── actions/
│   │       ├── players.ts            # createPlayer, getPlayers, updatePlayer, deletePlayer
│   │       ├── games.ts              # createGame, getGame, getRecentGames, completeGame
│   │       ├── rounds.ts             # createRound, addDisc, undoDisc, endRound, getCurrentRound
│   │       └── stats.ts              # getPlayerStats, getHeadToHead, getMatchHistory
│   └── components/
│       ├── ui/                       # shadcn/ui components (button, card, select, dialog, etc.)
│       ├── player-half.tsx           # One player's half of the split screen
│       ├── center-bar.tsx            # Shared center controls (end round, undo, round number)
│       ├── ring-button.tsx           # Individual ring tap button (20/15/10/5)
│       ├── player-picker.tsx         # Player selection dropdown for new game setup
│       ├── game-over-dialog.tsx      # Winner celebration overlay with rematch option
│       └── stat-card.tsx             # Individual stat display card
├── tests/
│   ├── actions/
│   │   ├── players.test.ts           # Player CRUD tests
│   │   ├── games.test.ts             # Game lifecycle tests
│   │   ├── rounds.test.ts            # Round/disc logic tests (core scoring logic)
│   │   └── stats.test.ts             # Stats derivation tests
│   └── setup.ts                      # Test setup (fresh DB per test)
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
├── vitest.config.ts
└── components.json                   # shadcn/ui config
```

---

## Chunk 1: Project Scaffolding & Database

### Task 1: Initialize Next.js Project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`

- [ ] **Step 1: Create Next.js project**

Run:
```bash
cd /Users/rob/env/crokinole
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

When prompted, accept defaults. This creates the full Next.js scaffolding. Note: if `create-next-app` refuses due to non-empty directory, scaffold into a temp directory and move the files over.

Expected: Project files created, `node_modules` installed.

**Important:** The repo's existing `.gitignore` is Python-oriented and contains a `lib/` rule that would hide `src/lib/`. After scaffolding, verify that `create-next-app` replaced it with a Node.js `.gitignore`. If not, replace `.gitignore` content with the generated Next.js one. Ensure there is no `lib/` entry that would ignore `src/lib/`.

- [ ] **Step 2: Install additional dependencies**

Run:
```bash
npm install prisma @prisma/client
npm install -D vitest @vitejs/plugin-react
```

- [ ] **Step 3: Initialize shadcn/ui**

Run:
```bash
npx shadcn@latest init -d
```

Accept defaults (New York style, Zinc base color, CSS variables). This creates `components.json` and sets up `src/components/ui/`.

- [ ] **Step 4: Add shadcn/ui components we'll need**

Run:
```bash
npx shadcn@latest add button card dialog select input label
```

- [ ] **Step 5: Add crokinole ring colors to globals.css**

Append the following to the end of `src/app/globals.css` (keep everything that `create-next-app` and `shadcn init` generated):

```css
/* Ring button colors for crokinole scoring */
:root {
  --ring-20: #ffd700;
  --ring-15: #c0392b;
  --ring-10: #2980b9;
  --ring-5: #27ae60;
}
```

- [ ] **Step 6: Update root layout for dark mode**

Update `src/app/layout.tsx` — ensure the `<html>` tag has `className="dark"` and the body uses the Inter font:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Crokinole Scorekeeper",
  description: "Keep score for your crokinole games",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 7: Verify dev server starts**

Run:
```bash
npm run dev
```

Expected: Server starts on http://localhost:3000 with dark background.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: initialize Next.js project with shadcn/ui and dark theme"
```

---

### Task 2: Prisma Schema & Database

**Files:**
- Create: `prisma/schema.prisma`, `src/lib/db.ts`

- [ ] **Step 1: Initialize Prisma**

Run:
```bash
npx prisma init --datasource-provider sqlite
```

Expected: Creates `prisma/schema.prisma` and `.env` with `DATABASE_URL`.

- [ ] **Step 2: Write the Prisma schema**

Replace `prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Player {
  id        Int      @id @default(autoincrement())
  name      String   @unique
  createdAt DateTime @default(now())

  gamesAsPlayer1    Game[]  @relation("Player1")
  gamesAsPlayer2    Game[]  @relation("Player2")
  gamesWon          Game[]  @relation("Winner")
  gamesFirstHammer  Game[]  @relation("FirstHammer")
  discs             Disc[]
  roundsWithHammer  Round[] @relation("HammerPlayer")
  roundsAwarded     Round[] @relation("AwardedPlayer")
}

model Game {
  id                  Int      @id @default(autoincrement())
  player1Id           Int
  player2Id           Int
  player1Score        Int      @default(0)
  player2Score        Int      @default(0)
  winnerId            Int?
  status              String   @default("in_progress") // "in_progress" | "completed"
  firstHammerPlayerId Int
  createdAt           DateTime @default(now())

  player1     Player  @relation("Player1", fields: [player1Id], references: [id])
  player2     Player  @relation("Player2", fields: [player2Id], references: [id])
  winner      Player? @relation("Winner", fields: [winnerId], references: [id])
  firstHammer Player  @relation("FirstHammer", fields: [firstHammerPlayerId], references: [id])
  rounds      Round[]
}

model Round {
  id                Int      @id @default(autoincrement())
  gameId            Int
  roundNumber       Int
  player1RoundScore Int      @default(0)
  player2RoundScore Int      @default(0)
  pointsAwarded     Int      @default(0)
  awardedToPlayerId Int?
  hammerPlayerId    Int
  status            String   @default("in_progress") // "in_progress" | "completed"
  createdAt         DateTime @default(now())

  game      Game    @relation(fields: [gameId], references: [id])
  awardedTo Player? @relation("AwardedPlayer", fields: [awardedToPlayerId], references: [id])
  hammer    Player  @relation("HammerPlayer", fields: [hammerPlayerId], references: [id])
  discs     Disc[]
}

model Disc {
  id        Int      @id @default(autoincrement())
  roundId   Int
  playerId  Int
  ringValue Int      // 5, 10, 15, or 20
  createdAt DateTime @default(now())

  round  Round  @relation(fields: [roundId], references: [id])
  player Player @relation(fields: [playerId], references: [id])
}
```

- [ ] **Step 3: Set DATABASE_URL**

Ensure `.env` contains:
```
DATABASE_URL="file:./dev.db"
```

Add `.env` to `.gitignore` if not already there. Also add `prisma/dev.db*` to `.gitignore`.

- [ ] **Step 4: Run initial migration**

Run:
```bash
npx prisma migrate dev --name init
```

Expected: Creates `prisma/migrations/` directory and `prisma/dev.db`.

- [ ] **Step 5: Create Prisma client singleton**

Create `src/lib/db.ts`:

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
```

- [ ] **Step 6: Verify Prisma Studio works**

Run:
```bash
npx prisma studio
```

Expected: Opens browser showing empty Player, Game, Round, Disc tables.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/lib/db.ts .gitignore
git commit -m "feat: add Prisma schema with Players, Games, Rounds, Discs"
```

---

### Task 3: Test Infrastructure

**Files:**
- Create: `vitest.config.ts`, `tests/setup.ts`

- [ ] **Step 1: Create Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    env: {
      DATABASE_URL: "file:./test.db",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

**Important:** After creating this config, run `DATABASE_URL="file:./test.db" npx prisma migrate deploy` to create the test database. Add `prisma/test.db*` to `.gitignore`.

- [ ] **Step 2: Create test setup with fresh DB per test**

Create `tests/setup.ts`:

```ts
import { beforeEach } from "vitest";
import { db } from "@/lib/db";

beforeEach(async () => {
  // Clear all tables before each test (order matters for FK constraints)
  await db.disc.deleteMany();
  await db.round.deleteMany();
  await db.game.deleteMany();
  await db.player.deleteMany();
});
```

- [ ] **Step 3: Add test script to package.json**

Add to `package.json` scripts:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Write a smoke test to verify setup**

Create `tests/smoke.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";

describe("test infrastructure", () => {
  it("can create and query a player", async () => {
    const player = await db.player.create({ data: { name: "TestPlayer" } });
    expect(player.name).toBe("TestPlayer");
    expect(player.id).toBeDefined();
  });
});
```

- [ ] **Step 5: Run the smoke test**

Run:
```bash
npm test
```

Expected: 1 test passes.

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts tests/ package.json
git commit -m "feat: add Vitest test infrastructure with per-test DB cleanup"
```

---

## Chunk 2: Player Management & Home Screen

### Task 4: Player Server Actions

**Files:**
- Create: `src/lib/actions/players.ts`
- Test: `tests/actions/players.test.ts`

- [ ] **Step 1: Write failing tests for player CRUD**

Replace `tests/actions/players.test.ts` with:

```ts
import { describe, it, expect } from "vitest";
import {
  createPlayer,
  getPlayers,
  updatePlayer,
  deletePlayer,
} from "@/lib/actions/players";

describe("player actions", () => {
  it("creates a player and returns it", async () => {
    const player = await createPlayer("Alice");
    expect(player.name).toBe("Alice");
    expect(player.id).toBeDefined();
  });

  it("rejects duplicate names", async () => {
    await createPlayer("Alice");
    await expect(createPlayer("Alice")).rejects.toThrow();
  });

  it("rejects empty names", async () => {
    await expect(createPlayer("")).rejects.toThrow();
    await expect(createPlayer("   ")).rejects.toThrow();
  });

  it("lists all players alphabetically", async () => {
    await createPlayer("Charlie");
    await createPlayer("Alice");
    await createPlayer("Bob");
    const players = await getPlayers();
    expect(players.map((p) => p.name)).toEqual(["Alice", "Bob", "Charlie"]);
  });

  it("updates a player name", async () => {
    const player = await createPlayer("Alice");
    const updated = await updatePlayer(player.id, "Alicia");
    expect(updated.name).toBe("Alicia");
  });

  it("deletes a player", async () => {
    const player = await createPlayer("Alice");
    await deletePlayer(player.id);
    const players = await getPlayers();
    expect(players).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
npm test -- tests/actions/players.test.ts
```

Expected: FAIL — cannot find module `@/lib/actions/players`.

- [ ] **Step 3: Implement player actions**

Create `src/lib/actions/players.ts`:

```ts
"use server";

import { db } from "@/lib/db";

export async function createPlayer(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Player name cannot be empty");
  }
  return db.player.create({ data: { name: trimmed } });
}

export async function getPlayers() {
  return db.player.findMany({ orderBy: { name: "asc" } });
}

export async function updatePlayer(id: number, name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Player name cannot be empty");
  }
  return db.player.update({ where: { id }, data: { name: trimmed } });
}

export async function deletePlayer(id: number) {
  return db.player.delete({ where: { id } });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
npm test -- tests/actions/players.test.ts
```

Expected: All 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/actions/players.ts tests/actions/players.test.ts
git commit -m "feat: add player CRUD server actions with tests"
```

---

### Task 5: Player Roster Page

**Files:**
- Create: `src/app/players/page.tsx`

- [ ] **Step 1: Build the player roster page**

Create `src/app/players/page.tsx`:

```tsx
import { getPlayers, createPlayer, updatePlayer, deletePlayer } from "@/lib/actions/players";
import { revalidatePath } from "next/cache";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default async function PlayersPage() {
  const players = await getPlayers();

  async function handleCreate(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    if (name?.trim()) {
      await createPlayer(name);
      revalidatePath("/players");
    }
  }

  async function handleDelete(formData: FormData) {
    "use server";
    const id = Number(formData.get("id"));
    await deletePlayer(id);
    revalidatePath("/players");
  }

  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Players</h1>
        <Link href="/">
          <Button variant="ghost" size="sm">Back</Button>
        </Link>
      </div>

      <form action={handleCreate} className="flex gap-2 mb-6">
        <Input
          name="name"
          placeholder="New player name"
          className="flex-1"
          required
        />
        <Button type="submit">Add</Button>
      </form>

      <div className="space-y-2">
        {players.map((player) => (
          <Card key={player.id}>
            <CardContent className="flex items-center justify-between p-4">
              <span className="font-medium">{player.name}</span>
              <form action={handleDelete}>
                <input type="hidden" name="id" value={player.id} />
                <Button variant="ghost" size="sm" type="submit" className="text-destructive">
                  Remove
                </Button>
              </form>
            </CardContent>
          </Card>
        ))}
        {players.length === 0 && (
          <p className="text-muted-foreground text-center py-8">
            No players yet. Add someone to get started!
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the page renders**

Run:
```bash
npm run dev
```

Navigate to http://localhost:3000/players. Add a player, verify it appears. Remove it, verify it disappears.

- [ ] **Step 3: Commit**

```bash
git add src/app/players/page.tsx
git commit -m "feat: add player roster management page"
```

---

### Task 6: Home Screen

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/lib/actions/games.ts` (`getRecentGames` and `getInProgressGames`)

- [ ] **Step 1: Create getRecentGames action**

Create `src/lib/actions/games.ts`:

```ts
"use server";

import { db } from "@/lib/db";

export async function getRecentGames() {
  return db.game.findMany({
    where: { status: "completed" },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      player1: true,
      player2: true,
      winner: true,
    },
  });
}

export async function getInProgressGames() {
  return db.game.findMany({
    where: { status: "in_progress" },
    orderBy: { createdAt: "desc" },
    include: {
      player1: true,
      player2: true,
    },
  });
}
```

- [ ] **Step 2: Build the home screen**

Replace `src/app/page.tsx` with:

```tsx
import { getRecentGames, getInProgressGames } from "@/lib/actions/games";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default async function HomePage() {
  const recentGames = await getRecentGames();
  const inProgressGames = await getInProgressGames();

  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto">
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold mb-2">Crokinole</h1>
        <p className="text-muted-foreground">Scorekeeper</p>
      </div>

      <div className="space-y-3 mb-8">
        <Link href="/game/new" className="block">
          <Button className="w-full h-14 text-lg" size="lg">
            New Game
          </Button>
        </Link>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/players">
            <Button variant="secondary" className="w-full h-12">
              Players
            </Button>
          </Link>
          <Link href="/stats">
            <Button variant="secondary" className="w-full h-12">
              Stats
            </Button>
          </Link>
        </div>
      </div>

      {inProgressGames.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Resume Game</h2>
          <div className="space-y-2">
            {inProgressGames.map((game) => (
              <Link key={game.id} href={`/game/${game.id}`}>
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        {game.player1.name} {game.player1Score}
                        <span className="text-muted-foreground mx-2">vs</span>
                        {game.player2.name} {game.player2Score}
                      </div>
                      <span className="text-xs text-primary">In Progress</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {recentGames.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Recent Games</h2>
          <div className="space-y-2">
            {recentGames.map((game) => (
              <Card key={game.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className={game.winnerId === game.player1Id ? "font-bold" : ""}>
                        {game.player1.name} {game.player1Score}
                      </span>
                      <span className="text-muted-foreground mx-2">vs</span>
                      <span className={game.winnerId === game.player2Id ? "font-bold" : ""}>
                        {game.player2.name} {game.player2Score}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(game.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify the home screen**

Run `npm run dev`, navigate to http://localhost:3000. Verify: title, New Game button, Players button, Stats button all render. Recent Games section is empty (no completed games yet).

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx src/lib/actions/games.ts
git commit -m "feat: add home screen with navigation and recent games"
```

---

## Chunk 3: Game Creation & Active Gameplay

### Task 7: Game & Round Server Actions

**Files:**
- Modify: `src/lib/actions/games.ts`
- Create: `src/lib/actions/rounds.ts`
- Test: `tests/actions/games.test.ts`, `tests/actions/rounds.test.ts`

- [ ] **Step 1: Write failing tests for game actions**

Create `tests/actions/games.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { createPlayer } from "@/lib/actions/players";
import { createGame, getGame } from "@/lib/actions/games";

let player1Id: number;
let player2Id: number;

beforeEach(async () => {
  const p1 = await createPlayer("Alice");
  const p2 = await createPlayer("Bob");
  player1Id = p1.id;
  player2Id = p2.id;
});

describe("game actions", () => {
  it("creates a game with initial round", async () => {
    const game = await createGame(player1Id, player2Id, player1Id);
    expect(game.status).toBe("in_progress");
    expect(game.player1Score).toBe(0);
    expect(game.player2Score).toBe(0);
    expect(game.firstHammerPlayerId).toBe(player1Id);
  });

  it("getGame returns game with current round and discs", async () => {
    const created = await createGame(player1Id, player2Id, player1Id);
    const game = await getGame(created.id);
    expect(game).toBeDefined();
    expect(game!.rounds).toHaveLength(1);
    expect(game!.rounds[0].roundNumber).toBe(1);
    expect(game!.rounds[0].hammerPlayerId).toBe(player1Id);
    expect(game!.rounds[0].status).toBe("in_progress");
  });

  it("rejects same player for both sides", async () => {
    await expect(createGame(player1Id, player1Id, player1Id)).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
npm test -- tests/actions/games.test.ts
```

Expected: FAIL — `createGame` not exported.

- [ ] **Step 3: Implement game actions**

Update `src/lib/actions/games.ts`:

```ts
"use server";

import { db } from "@/lib/db";

export async function createGame(
  player1Id: number,
  player2Id: number,
  firstHammerPlayerId: number
) {
  if (player1Id === player2Id) {
    throw new Error("Players must be different");
  }
  if (firstHammerPlayerId !== player1Id && firstHammerPlayerId !== player2Id) {
    throw new Error("Hammer player must be one of the two game players");
  }

  return db.$transaction(async (tx) => {
    const game = await tx.game.create({
      data: {
        player1Id,
        player2Id,
        firstHammerPlayerId,
      },
    });

    // Create the first round
    await tx.round.create({
      data: {
        gameId: game.id,
        roundNumber: 1,
        hammerPlayerId: firstHammerPlayerId,
      },
    });

    return game;
  });
}

export async function getGame(id: number) {
  return db.game.findUnique({
    where: { id },
    include: {
      player1: true,
      player2: true,
      winner: true,
      rounds: {
        orderBy: { roundNumber: "asc" },
        include: { discs: true },
      },
    },
  });
}

export async function getRecentGames() {
  return db.game.findMany({
    where: { status: "completed" },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      player1: true,
      player2: true,
      winner: true,
    },
  });
}

export async function getInProgressGames() {
  return db.game.findMany({
    where: { status: "in_progress" },
    orderBy: { createdAt: "desc" },
    include: {
      player1: true,
      player2: true,
    },
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
npm test -- tests/actions/games.test.ts
```

Expected: All 3 tests pass.

- [ ] **Step 5: Write failing tests for round/disc actions**

Create `tests/actions/rounds.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { createPlayer } from "@/lib/actions/players";
import { createGame, getGame } from "@/lib/actions/games";
import { addDisc, undoDisc, endRound } from "@/lib/actions/rounds";

let gameId: number;
let player1Id: number;
let player2Id: number;

beforeEach(async () => {
  const p1 = await createPlayer("Alice");
  const p2 = await createPlayer("Bob");
  player1Id = p1.id;
  player2Id = p2.id;
  const game = await createGame(player1Id, player2Id, player1Id);
  gameId = game.id;
});

describe("addDisc", () => {
  it("adds a disc to the current round", async () => {
    await addDisc(gameId, player1Id, 20);
    const game = await getGame(gameId);
    const currentRound = game!.rounds[0];
    expect(currentRound.discs).toHaveLength(1);
    expect(currentRound.discs[0].ringValue).toBe(20);
    expect(currentRound.discs[0].playerId).toBe(player1Id);
  });

  it("rejects invalid ring values", async () => {
    await expect(addDisc(gameId, player1Id, 7)).rejects.toThrow();
    await expect(addDisc(gameId, player1Id, 0)).rejects.toThrow();
    await expect(addDisc(gameId, player1Id, 25)).rejects.toThrow();
  });
});

describe("undoDisc", () => {
  it("removes the most recent disc for the game", async () => {
    await addDisc(gameId, player1Id, 20);
    await addDisc(gameId, player1Id, 15);
    await undoDisc(gameId);
    const game = await getGame(gameId);
    expect(game!.rounds[0].discs).toHaveLength(1);
    expect(game!.rounds[0].discs[0].ringValue).toBe(20);
  });

  it("does nothing if no discs in current round", async () => {
    await undoDisc(gameId); // should not throw
    const game = await getGame(gameId);
    expect(game!.rounds[0].discs).toHaveLength(0);
  });
});

describe("endRound", () => {
  it("calculates difference and awards to higher scorer", async () => {
    await addDisc(gameId, player1Id, 20);
    await addDisc(gameId, player1Id, 15);
    await addDisc(gameId, player2Id, 10);
    // Player 1: 35, Player 2: 10, difference: 25

    const result = await endRound(gameId);
    expect(result.pointsAwarded).toBe(25);
    expect(result.awardedToPlayerId).toBe(player1Id);

    const game = await getGame(gameId);
    expect(game!.player1Score).toBe(25);
    expect(game!.player2Score).toBe(0);
    // New round should be created
    expect(game!.rounds).toHaveLength(2);
    expect(game!.rounds[1].roundNumber).toBe(2);
    // Hammer should alternate
    expect(game!.rounds[1].hammerPlayerId).toBe(player2Id);
  });

  it("awards 0 on tie", async () => {
    await addDisc(gameId, player1Id, 10);
    await addDisc(gameId, player2Id, 10);

    const result = await endRound(gameId);
    expect(result.pointsAwarded).toBe(0);
    expect(result.awardedToPlayerId).toBeNull();

    const game = await getGame(gameId);
    expect(game!.player1Score).toBe(0);
    expect(game!.player2Score).toBe(0);
  });

  it("triggers game over when a player reaches 100", async () => {
    // Manually set scores close to 100 via multiple rounds
    // Round 1: P1 gets 50
    await addDisc(gameId, player1Id, 20);
    await addDisc(gameId, player1Id, 20);
    await addDisc(gameId, player1Id, 10);
    await endRound(gameId);

    // Round 2: P1 gets 50 more (total 100)
    await addDisc(gameId, player1Id, 20);
    await addDisc(gameId, player1Id, 20);
    await addDisc(gameId, player1Id, 10);
    const result = await endRound(gameId);

    const game = await getGame(gameId);
    expect(game!.status).toBe("completed");
    expect(game!.winnerId).toBe(player1Id);
    expect(game!.player1Score).toBe(100);
  });

  it("handles empty round (0-0 tie)", async () => {
    const result = await endRound(gameId);
    expect(result.pointsAwarded).toBe(0);
    expect(result.awardedToPlayerId).toBeNull();
  });
});
```

- [ ] **Step 6: Run tests to verify they fail**

Run:
```bash
npm test -- tests/actions/rounds.test.ts
```

Expected: FAIL — cannot find module `@/lib/actions/rounds`.

- [ ] **Step 7: Implement round/disc actions**

Create `src/lib/actions/rounds.ts`:

```ts
"use server";

import { db } from "@/lib/db";

const VALID_RING_VALUES = [5, 10, 15, 20];

export async function addDisc(gameId: number, playerId: number, ringValue: number) {
  if (!VALID_RING_VALUES.includes(ringValue)) {
    throw new Error(`Invalid ring value: ${ringValue}. Must be 5, 10, 15, or 20.`);
  }

  const currentRound = await db.round.findFirst({
    where: { gameId, status: "in_progress" },
  });

  if (!currentRound) {
    throw new Error("No active round found");
  }

  return db.disc.create({
    data: {
      roundId: currentRound.id,
      playerId,
      ringValue,
    },
  });
}

export async function undoDisc(gameId: number) {
  const currentRound = await db.round.findFirst({
    where: { gameId, status: "in_progress" },
    include: { discs: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  if (!currentRound || currentRound.discs.length === 0) {
    return null;
  }

  return db.disc.delete({ where: { id: currentRound.discs[0].id } });
}

export async function endRound(gameId: number) {
  const game = await db.game.findUnique({
    where: { id: gameId },
    include: {
      rounds: {
        where: { status: "in_progress" },
        include: { discs: true },
      },
    },
  });

  if (!game || game.rounds.length === 0) {
    throw new Error("No active round found");
  }

  const round = game.rounds[0];

  // Calculate round scores
  const player1RoundScore = round.discs
    .filter((d) => d.playerId === game.player1Id)
    .reduce((sum, d) => sum + d.ringValue, 0);

  const player2RoundScore = round.discs
    .filter((d) => d.playerId === game.player2Id)
    .reduce((sum, d) => sum + d.ringValue, 0);

  const difference = Math.abs(player1RoundScore - player2RoundScore);
  let awardedToPlayerId: number | null = null;

  if (player1RoundScore > player2RoundScore) {
    awardedToPlayerId = game.player1Id;
  } else if (player2RoundScore > player1RoundScore) {
    awardedToPlayerId = game.player2Id;
  }

  // Calculate new game scores
  const newPlayer1Score =
    game.player1Score + (awardedToPlayerId === game.player1Id ? difference : 0);
  const newPlayer2Score =
    game.player2Score + (awardedToPlayerId === game.player2Id ? difference : 0);

  // Check for game over
  const isGameOver = newPlayer1Score >= 100 || newPlayer2Score >= 100;
  const winnerId = isGameOver
    ? newPlayer1Score >= 100
      ? game.player1Id
      : game.player2Id
    : null;

  // Determine next hammer (alternates: current hammer player becomes first shooter)
  const nextHammerPlayerId =
    round.hammerPlayerId === game.player1Id ? game.player2Id : game.player1Id;

  return db.$transaction(async (tx) => {
    // Complete the current round
    const completedRound = await tx.round.update({
      where: { id: round.id },
      data: {
        player1RoundScore,
        player2RoundScore,
        pointsAwarded: difference,
        awardedToPlayerId,
        status: "completed",
      },
    });

    // Update game scores
    await tx.game.update({
      where: { id: gameId },
      data: {
        player1Score: newPlayer1Score,
        player2Score: newPlayer2Score,
        ...(isGameOver && {
          status: "completed",
          winnerId,
        }),
      },
    });

    // Create next round if game continues
    if (!isGameOver) {
      await tx.round.create({
        data: {
          gameId,
          roundNumber: round.roundNumber + 1,
          hammerPlayerId: nextHammerPlayerId,
        },
      });
    }

    return completedRound;
  });
}
```

- [ ] **Step 8: Run all tests**

Run:
```bash
npm test
```

Expected: All tests pass (players + games + rounds).

- [ ] **Step 9: Commit**

```bash
git add src/lib/actions/rounds.ts src/lib/actions/games.ts tests/actions/games.test.ts tests/actions/rounds.test.ts
git commit -m "feat: add game creation and round scoring logic with tests"
```

---

### Task 8: New Game Setup Page

**Files:**
- Create: `src/app/game/new/page.tsx`, `src/components/player-picker.tsx`

- [ ] **Step 1: Create player picker component**

Create `src/components/player-picker.tsx`:

```tsx
"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Player {
  id: number;
  name: string;
}

interface PlayerPickerProps {
  players: Player[];
  name: string;
  placeholder: string;
  excludeId?: number;
  defaultValue?: string;
}

export function PlayerPicker({ players, name, placeholder, excludeId, defaultValue }: PlayerPickerProps) {
  const filtered = excludeId
    ? players.filter((p) => p.id !== excludeId)
    : players;

  return (
    <Select name={name} required defaultValue={defaultValue}>
      <SelectTrigger className="h-14 text-lg">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {filtered.map((player) => (
          <SelectItem key={player.id} value={String(player.id)}>
            {player.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 2: Create new game setup page**

Create `src/app/game/new/page.tsx`:

```tsx
import { getPlayers } from "@/lib/actions/players";
import { createGame } from "@/lib/actions/games";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlayerPicker } from "@/components/player-picker";
import Link from "next/link";

interface Props {
  searchParams: Promise<{ p1?: string; p2?: string }>;
}

export default async function NewGamePage({ searchParams }: Props) {
  const { p1, p2 } = await searchParams;
  const players = await getPlayers();
  const defaultPlayer1 = p1 ? Number(p1) : undefined;
  const defaultPlayer2 = p2 ? Number(p2) : undefined;

  async function handleCreate(formData: FormData) {
    "use server";
    const player1Id = Number(formData.get("player1"));
    const player2Id = Number(formData.get("player2"));
    const hammerPlayerId = Number(formData.get("hammer"));

    const game = await createGame(player1Id, player2Id, hammerPlayerId);
    redirect(`/game/${game.id}`);
  }

  if (players.length < 2) {
    return (
      <div className="min-h-screen bg-background p-4 max-w-md mx-auto">
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold mb-4">Need More Players</h1>
          <p className="text-muted-foreground mb-6">
            Add at least 2 players to start a game.
          </p>
          <Link href="/players">
            <Button>Manage Players</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">New Game</h1>
        <Link href="/">
          <Button variant="ghost" size="sm">Back</Button>
        </Link>
      </div>

      <form action={handleCreate}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Players</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Player 1</label>
              <PlayerPicker
                players={players}
                name="player1"
                placeholder="Select player 1"
                defaultValue={defaultPlayer1 ? String(defaultPlayer1) : undefined}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Player 2</label>
              <PlayerPicker
                players={players}
                name="player2"
                placeholder="Select player 2"
                defaultValue={defaultPlayer2 ? String(defaultPlayer2) : undefined}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>First Hammer</CardTitle>
          </CardHeader>
          <CardContent>
            <PlayerPicker
              players={players}
              name="hammer"
              placeholder="Who gets first hammer?"
            />
          </CardContent>
        </Card>

        <Button type="submit" className="w-full h-14 text-lg" size="lg">
          Start Game
        </Button>
      </form>
    </div>
  );
}
```

Note: The `PlayerPicker` uses a `Select` which submits the value as a string. The `excludeId` prop is available but the form here doesn't use client-side filtering between the two pickers (that would require making the page a client component). For now, server-side validation in `createGame` catches same-player selection. A future enhancement could add client-side filtering.

- [ ] **Step 3: Verify the new game flow**

Run `npm run dev`. Navigate to http://localhost:3000/game/new.
- If fewer than 2 players: see "Need More Players" message.
- Add 2+ players at /players, return to /game/new.
- Select two different players, pick hammer, tap Start Game.
- Should redirect to /game/[id] (will 404 for now — that's Task 9).

- [ ] **Step 4: Commit**

```bash
git add src/app/game/new/page.tsx src/components/player-picker.tsx
git commit -m "feat: add new game setup page with player selection"
```

---

### Task 9: Active Game Split Screen

**Files:**
- Create: `src/app/game/[id]/page.tsx`, `src/app/game/[id]/game-client.tsx`, `src/components/player-half.tsx`, `src/components/center-bar.tsx`, `src/components/ring-button.tsx`, `src/components/game-over-dialog.tsx`

- [ ] **Step 1: Create the ring button component**

Create `src/components/ring-button.tsx`:

```tsx
"use client";

interface RingButtonProps {
  value: number;
  onClick: () => void;
  disabled?: boolean;
}

const RING_COLORS: Record<number, string> = {
  20: "bg-[#ffd700] text-black hover:bg-[#e6c200]",
  15: "bg-[#c0392b] text-white hover:bg-[#a93226]",
  10: "bg-[#2980b9] text-white hover:bg-[#2471a3]",
  5: "bg-[#27ae60] text-white hover:bg-[#229954]",
};

export function RingButton({ value, onClick, disabled }: RingButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-14 h-14 rounded-full font-bold text-lg
        transition-transform active:scale-90
        ${RING_COLORS[value] || "bg-gray-500 text-white"}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      {value}
    </button>
  );
}
```

- [ ] **Step 2: Create the player half component**

Create `src/components/player-half.tsx`:

```tsx
"use client";

import { RingButton } from "./ring-button";

interface PlayerHalfProps {
  name: string;
  gameScore: number;
  roundScore: number;
  hasHammer: boolean;
  isRotated: boolean;
  onDiscTap: (ringValue: number) => void;
  disabled?: boolean;
}

export function PlayerHalf({
  name,
  gameScore,
  roundScore,
  hasHammer,
  isRotated,
  onDiscTap,
  disabled,
}: PlayerHalfProps) {
  const ringValues = isRotated ? [5, 10, 15, 20] : [20, 15, 10, 5];

  return (
    <div
      className={`
        flex-1 flex flex-col items-center justify-center p-4 gap-2
        ${isRotated ? "rotate-180" : ""}
      `}
    >
      <div className="text-xs uppercase tracking-widest text-muted-foreground">
        {name}
      </div>
      <div className="text-5xl font-bold">{gameScore}</div>
      <div className="text-sm text-muted-foreground">
        {hasHammer ? "Hammer" : "\u00A0"}
      </div>
      <div className="flex gap-3 mt-2">
        {ringValues.map((value) => (
          <RingButton
            key={value}
            value={value}
            onClick={() => onDiscTap(value)}
            disabled={disabled}
          />
        ))}
      </div>
      <div className="text-sm text-muted-foreground mt-1">
        Round: {roundScore}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create the center bar component**

Create `src/components/center-bar.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui/button";

interface CenterBarProps {
  roundNumber: number;
  onEndRound: () => void;
  onUndo: () => void;
  disabled?: boolean;
}

export function CenterBar({ roundNumber, onEndRound, onUndo, disabled }: CenterBarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-y border-border">
      <button
        onClick={onUndo}
        disabled={disabled}
        className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
      >
        Undo
      </button>
      <Button
        onClick={onEndRound}
        disabled={disabled}
        size="sm"
        className="px-6"
      >
        End Round
      </Button>
      <span className="text-xs text-muted-foreground">R{roundNumber}</span>
    </div>
  );
}
```

- [ ] **Step 4: Create the game over dialog component**

Create `src/components/game-over-dialog.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface GameOverDialogProps {
  open: boolean;
  winnerName: string;
  player1Name: string;
  player1Score: number;
  player2Name: string;
  player2Score: number;
  player1Id: number;
  player2Id: number;
}

export function GameOverDialog({
  open,
  winnerName,
  player1Name,
  player1Score,
  player2Name,
  player2Score,
  player1Id,
  player2Id,
}: GameOverDialogProps) {
  return (
    <Dialog open={open}>
      <DialogContent className="text-center" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-3xl">{winnerName} Wins!</DialogTitle>
          <DialogDescription className="text-lg mt-2">
            {player1Name} {player1Score} &mdash; {player2Score} {player2Name}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-4">
          <a href={`/game/new?p1=${player1Id}&p2=${player2Id}`}>
            <Button className="w-full" size="lg">
              Rematch
            </Button>
          </a>
          <a href="/">
            <Button variant="secondary" className="w-full" size="lg">
              Home
            </Button>
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 5: Create the active game page**

Create `src/app/game/[id]/page.tsx`:

```tsx
import { getGame } from "@/lib/actions/games";
import { notFound } from "next/navigation";
import { GameClient } from "./game-client";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function GamePage({ params }: Props) {
  const { id } = await params;
  const game = await getGame(Number(id));

  if (!game) {
    notFound();
  }

  return <GameClient game={game} />;
}
```

- [ ] **Step 6: Create the game client component**

Create `src/app/game/[id]/game-client.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { PlayerHalf } from "@/components/player-half";
import { CenterBar } from "@/components/center-bar";
import { GameOverDialog } from "@/components/game-over-dialog";
import { addDisc, undoDisc, endRound } from "@/lib/actions/rounds";

// Type matching what getGame returns
interface GameData {
  id: number;
  player1Id: number;
  player2Id: number;
  player1Score: number;
  player2Score: number;
  winnerId: number | null;
  status: string;
  player1: { id: number; name: string };
  player2: { id: number; name: string };
  winner: { id: number; name: string } | null;
  rounds: Array<{
    id: number;
    roundNumber: number;
    hammerPlayerId: number;
    status: string;
    discs: Array<{
      id: number;
      playerId: number;
      ringValue: number;
    }>;
  }>;
}

interface GameClientProps {
  game: GameData;
}

export function GameClient({ game }: GameClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const currentRound = game.rounds.find((r) => r.status === "in_progress");
  const isGameOver = game.status === "completed";

  // Calculate round scores from discs
  const player1RoundScore = currentRound
    ? currentRound.discs
        .filter((d) => d.playerId === game.player1Id)
        .reduce((sum, d) => sum + d.ringValue, 0)
    : 0;

  const player2RoundScore = currentRound
    ? currentRound.discs
        .filter((d) => d.playerId === game.player2Id)
        .reduce((sum, d) => sum + d.ringValue, 0)
    : 0;

  function handleDiscTap(playerId: number, ringValue: number) {
    startTransition(async () => {
      await addDisc(game.id, playerId, ringValue);
      router.refresh();
    });
  }

  function handleUndo() {
    startTransition(async () => {
      await undoDisc(game.id);
      router.refresh();
    });
  }

  function handleEndRound() {
    startTransition(async () => {
      await endRound(game.id);
      router.refresh();
    });
  }

  return (
    <div className="h-dvh flex flex-col bg-background overflow-hidden">
      {/* Player 1 (top, rotated 180deg) */}
      <div className="flex-1 flex bg-gradient-to-b from-blue-950/50 to-background">
        <PlayerHalf
          name={game.player1.name}
          gameScore={game.player1Score}
          roundScore={player1RoundScore}
          hasHammer={currentRound?.hammerPlayerId === game.player1Id}
          isRotated={true}
          onDiscTap={(v) => handleDiscTap(game.player1Id, v)}
          disabled={isPending || isGameOver}
        />
      </div>

      {/* Center bar */}
      <CenterBar
        roundNumber={currentRound?.roundNumber ?? game.rounds.length}
        onEndRound={handleEndRound}
        onUndo={handleUndo}
        disabled={isPending || isGameOver}
      />

      {/* Player 2 (bottom, normal orientation) */}
      <div className="flex-1 flex bg-gradient-to-t from-red-950/50 to-background">
        <PlayerHalf
          name={game.player2.name}
          gameScore={game.player2Score}
          roundScore={player2RoundScore}
          hasHammer={currentRound?.hammerPlayerId === game.player2Id}
          isRotated={false}
          onDiscTap={(v) => handleDiscTap(game.player2Id, v)}
          disabled={isPending || isGameOver}
        />
      </div>

      {/* Game over dialog */}
      <GameOverDialog
        open={isGameOver}
        winnerName={game.winner?.name ?? ""}
        player1Name={game.player1.name}
        player1Score={game.player1Score}
        player2Name={game.player2.name}
        player2Score={game.player2Score}
        player1Id={game.player1Id}
        player2Id={game.player2Id}
      />
    </div>
  );
}
```

- [ ] **Step 7: Verify the full game flow**

Run `npm run dev`. Navigate to http://localhost:3000.
1. Go to Players, add "Rob" and "Dave"
2. Tap New Game, select both players, pick hammer, start
3. Tap ring buttons on each side — verify round scores tally
4. Tap Undo — verify last disc removed
5. Tap End Round — verify scores update and round resets
6. Play until someone hits 100 — verify game over dialog appears
7. Verify top half is rotated 180 degrees

- [ ] **Step 8: Commit**

```bash
git add src/app/game/ src/components/ring-button.tsx src/components/player-half.tsx src/components/center-bar.tsx src/components/game-over-dialog.tsx
git commit -m "feat: add active game split-screen with disc scoring and game over"
```

---

## Chunk 4: Stats & Polish

### Task 10: Stats Server Actions

**Files:**
- Create: `src/lib/actions/stats.ts`
- Test: `tests/actions/stats.test.ts`

- [ ] **Step 1: Write failing tests for stats**

Create `tests/actions/stats.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { createPlayer } from "@/lib/actions/players";
import { createGame } from "@/lib/actions/games";
import { addDisc, endRound } from "@/lib/actions/rounds";
import { getPlayerStats, getHeadToHead, getMatchHistory } from "@/lib/actions/stats";

let player1Id: number;
let player2Id: number;

async function playGame(p1Score: number, p2Score: number) {
  const game = await createGame(player1Id, player2Id, player1Id);
  // Add discs to make p1 score p1Score and p2 score p2Score in a single round
  // Use 20s and 5s to hit the target
  let remaining = p1Score;
  while (remaining >= 20) {
    await addDisc(game.id, player1Id, 20);
    remaining -= 20;
  }
  while (remaining >= 5) {
    await addDisc(game.id, player1Id, 5);
    remaining -= 5;
  }

  remaining = p2Score;
  while (remaining >= 20) {
    await addDisc(game.id, player2Id, 20);
    remaining -= 20;
  }
  while (remaining >= 5) {
    await addDisc(game.id, player2Id, 5);
    remaining -= 5;
  }

  await endRound(game.id);
  return game.id;
}

beforeEach(async () => {
  const p1 = await createPlayer("Alice");
  const p2 = await createPlayer("Bob");
  player1Id = p1.id;
  player2Id = p2.id;
});

describe("getPlayerStats", () => {
  it("returns correct stats after games", async () => {
    // Game 1: Alice wins 100-0 (diff via single round of 100-0)
    await playGame(100, 0);
    // Game 2: Alice wins 100-0
    await playGame(100, 0);

    const stats = await getPlayerStats(player1Id);
    expect(stats.wins).toBe(2);
    expect(stats.losses).toBe(0);
    expect(stats.gamesPlayed).toBe(2);
    expect(stats.winPercent).toBe(100);
    expect(stats.total20s).toBe(10); // 5 x 20-point discs per game, 2 games
    expect(stats.avgMargin).toBe(100);
    expect(stats.avgRoundScore).toBe(100);
    expect(stats.highestRoundScore).toBe(100);
  });

  it("returns zero stats for player with no games", async () => {
    const stats = await getPlayerStats(player1Id);
    expect(stats.wins).toBe(0);
    expect(stats.losses).toBe(0);
    expect(stats.gamesPlayed).toBe(0);
  });
});

describe("getHeadToHead", () => {
  it("returns head-to-head record", async () => {
    await playGame(100, 0); // Alice wins
    await playGame(100, 0); // Alice wins

    const h2h = await getHeadToHead(player1Id, player2Id);
    expect(h2h.wins).toBe(2);
    expect(h2h.losses).toBe(0);
  });
});

describe("getMatchHistory", () => {
  it("returns completed games for a player", async () => {
    await playGame(100, 0);

    const history = await getMatchHistory(player1Id);
    expect(history).toHaveLength(1);
    expect(history[0].player1.name).toBe("Alice");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
npm test -- tests/actions/stats.test.ts
```

Expected: FAIL — cannot find module `@/lib/actions/stats`.

- [ ] **Step 3: Implement stats actions**

Create `src/lib/actions/stats.ts`:

```ts
"use server";

import { db } from "@/lib/db";

export async function getPlayerStats(playerId: number) {
  const games = await db.game.findMany({
    where: {
      status: "completed",
      OR: [{ player1Id: playerId }, { player2Id: playerId }],
    },
  });

  const wins = games.filter((g) => g.winnerId === playerId).length;
  const losses = games.length - wins;
  const gamesPlayed = games.length;
  const winPercent = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;

  // Average margin: player's score minus opponent's score across all games
  const totalMargin = games.reduce((sum, g) => {
    const playerScore = g.player1Id === playerId ? g.player1Score : g.player2Score;
    const opponentScore = g.player1Id === playerId ? g.player2Score : g.player1Score;
    return sum + (playerScore - opponentScore);
  }, 0);
  const avgMargin = gamesPlayed > 0 ? Math.round((totalMargin / gamesPlayed) * 10) / 10 : 0;

  // Total 20s
  const total20s = await db.disc.count({
    where: {
      playerId,
      ringValue: 20,
      round: { game: { status: "completed" } },
    },
  });

  // Round stats
  const rounds = await db.round.findMany({
    where: {
      status: "completed",
      game: {
        status: "completed",
        OR: [{ player1Id: playerId }, { player2Id: playerId }],
      },
    },
    include: { game: true },
  });

  const roundScores = rounds.map((r) =>
    r.game.player1Id === playerId ? r.player1RoundScore : r.player2RoundScore
  );

  const avgRoundScore =
    roundScores.length > 0
      ? Math.round((roundScores.reduce((a, b) => a + b, 0) / roundScores.length) * 10) / 10
      : 0;

  const highestRoundScore =
    roundScores.length > 0 ? Math.max(...roundScores) : 0;

  return {
    wins,
    losses,
    gamesPlayed,
    winPercent,
    avgMargin,
    total20s,
    avgRoundScore,
    highestRoundScore,
  };
}

export async function getHeadToHead(playerId: number, opponentId: number) {
  const games = await db.game.findMany({
    where: {
      status: "completed",
      OR: [
        { player1Id: playerId, player2Id: opponentId },
        { player1Id: opponentId, player2Id: playerId },
      ],
    },
  });

  const wins = games.filter((g) => g.winnerId === playerId).length;
  const losses = games.filter((g) => g.winnerId === opponentId).length;

  return { wins, losses, gamesPlayed: games.length };
}

export async function getMatchHistory(playerId: number) {
  return db.game.findMany({
    where: {
      status: "completed",
      OR: [{ player1Id: playerId }, { player2Id: playerId }],
    },
    orderBy: { createdAt: "desc" },
    include: {
      player1: true,
      player2: true,
      winner: true,
    },
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
npm test -- tests/actions/stats.test.ts
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/actions/stats.ts tests/actions/stats.test.ts
git commit -m "feat: add stats server actions with tests"
```

---

### Task 11: Stats Page UI

**Files:**
- Create: `src/app/stats/page.tsx`, `src/components/stat-card.tsx`

- [ ] **Step 1: Create stat card component**

Create `src/components/stat-card.tsx`:

```tsx
interface StatCardProps {
  label: string;
  value: string | number;
}

export function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="bg-muted/50 rounded-lg p-4 text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
        {label}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the stats page**

Create `src/app/stats/page.tsx`:

```tsx
import { getPlayers } from "@/lib/actions/players";
import { getPlayerStats, getHeadToHead, getMatchHistory } from "@/lib/actions/stats";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import Link from "next/link";
import { redirect } from "next/navigation";

interface Props {
  searchParams: Promise<{ player?: string; opponent?: string }>;
}

export default async function StatsPage({ searchParams }: Props) {
  const { player: playerParam, opponent: opponentParam } = await searchParams;
  const players = await getPlayers();

  const selectedPlayerId = playerParam ? Number(playerParam) : null;
  const selectedOpponentId = opponentParam ? Number(opponentParam) : null;

  const stats = selectedPlayerId ? await getPlayerStats(selectedPlayerId) : null;
  const h2h =
    selectedPlayerId && selectedOpponentId
      ? await getHeadToHead(selectedPlayerId, selectedOpponentId)
      : null;
  const history = selectedPlayerId ? await getMatchHistory(selectedPlayerId) : null;

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId);

  async function selectPlayer(formData: FormData) {
    "use server";
    const id = formData.get("playerId") as string;
    redirect(`/stats?player=${id}`);
  }

  async function selectOpponent(formData: FormData) {
    "use server";
    const id = formData.get("opponentId") as string;
    redirect(`/stats?player=${selectedPlayerId}&opponent=${id}`);
  }

  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Stats</h1>
        <Link href="/">
          <Button variant="ghost" size="sm">Back</Button>
        </Link>
      </div>

      {/* Player selector */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            {players.map((p) => (
              <form key={p.id} action={selectPlayer}>
                <input type="hidden" name="playerId" value={p.id} />
                <Button
                  type="submit"
                  variant={p.id === selectedPlayerId ? "default" : "outline"}
                  size="sm"
                >
                  {p.name}
                </Button>
              </form>
            ))}
          </div>
        </CardContent>
      </Card>

      {stats && selectedPlayer && (
        <>
          {/* Individual stats */}
          <h2 className="text-lg font-semibold mb-3">{selectedPlayer.name}</h2>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <StatCard label="Record" value={`${stats.wins}W - ${stats.losses}L`} />
            <StatCard label="Win %" value={`${stats.winPercent}%`} />
            <StatCard label="Avg Margin" value={stats.avgMargin > 0 ? `+${stats.avgMargin}` : stats.avgMargin} />
            <StatCard label="Total 20s" value={stats.total20s} />
            <StatCard label="Avg Round" value={stats.avgRoundScore} />
            <StatCard label="Best Round" value={stats.highestRoundScore} />
            <StatCard label="Games" value={stats.gamesPlayed} />
          </div>

          {/* Head-to-head */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Head-to-Head</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-3">
                {players
                  .filter((p) => p.id !== selectedPlayerId)
                  .map((p) => (
                    <form key={p.id} action={selectOpponent}>
                      <input type="hidden" name="opponentId" value={p.id} />
                      <Button
                        type="submit"
                        variant={p.id === selectedOpponentId ? "default" : "outline"}
                        size="sm"
                      >
                        {p.name}
                      </Button>
                    </form>
                  ))}
              </div>
              {h2h && (
                <div className="text-center py-2">
                  <span className="text-2xl font-bold">
                    {h2h.wins} - {h2h.losses}
                  </span>
                  <span className="text-muted-foreground ml-2">
                    ({h2h.gamesPlayed} games)
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Match history */}
          {history && history.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Match History</h2>
              <div className="space-y-2">
                {history.map((game) => (
                  <Card key={game.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className={game.winnerId === game.player1Id ? "font-bold" : ""}>
                            {game.player1.name} {game.player1Score}
                          </span>
                          <span className="text-muted-foreground mx-2">vs</span>
                          <span className={game.winnerId === game.player2Id ? "font-bold" : ""}>
                            {game.player2.name} {game.player2Score}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {game.createdAt.toLocaleDateString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!selectedPlayerId && (
        <p className="text-muted-foreground text-center py-8">
          Select a player to view their stats.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify the stats page**

Run `npm run dev`. Navigate to http://localhost:3000/stats.
- Select a player — verify stats render (will be zeros if no completed games).
- Play a full game to completion via /game/new, then check stats update.
- Select an opponent for head-to-head.

- [ ] **Step 4: Commit**

```bash
git add src/app/stats/page.tsx src/components/stat-card.tsx
git commit -m "feat: add stats page with individual stats, head-to-head, and match history"
```

---

### Task 12: Final Polish & Full Test

**Files:**
- Various minor adjustments

- [ ] **Step 1: Run the full test suite**

Run:
```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 2: Run a production build to verify no build errors**

Run:
```bash
npm run build
```

Expected: Build completes without errors.

- [ ] **Step 3: Full manual smoke test**

Run `npm run dev` and test the complete flow:
1. Home screen loads
2. Add 2 players at /players
3. Start new game, pick players and hammer
4. Tap discs for both players, verify tallies
5. Tap Undo, verify last disc removed
6. Tap End Round, verify difference awarded correctly
7. Verify hammer alternates
8. Play to 100, verify game over dialog
9. Check stats page shows updated stats
10. Check home screen shows the completed game in Recent Games

- [ ] **Step 4: Commit any fixes from smoke testing**

```bash
git add -A
git commit -m "fix: polish from smoke testing"
```

(Skip this commit if no fixes were needed.)

- [ ] **Step 5: Final commit — tag as v0.1.0**

```bash
git tag v0.1.0
```
