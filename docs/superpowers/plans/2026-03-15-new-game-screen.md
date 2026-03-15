# New Game Screen Redesign — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dropdown-based new game screen with a search + recent chips + tap-to-assign player selection flow and contextual hammer picker.

**Architecture:** Single client component (`NewGameClient`) owns all interactive state (player selection, search, step transitions). The server page becomes a thin data-fetching shell. One new server action (`getRecentPlayers`) queries recent game participants.

**Tech Stack:** Next.js 16 (App Router), React 19, Prisma 7 + SQLite, Tailwind 4, Vitest

**Spec:** `docs/superpowers/specs/2026-03-15-new-game-screen-design.md`

---

## Chunk 1: Backend — `getRecentPlayers` action

### Task 1: Add `getRecentPlayers` with tests

**Files:**
- Modify: `src/lib/actions/players.ts`
- Modify: `tests/actions/players.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `tests/actions/players.test.ts`:

Add `getRecentPlayers` to the existing import at the top of the file:

```ts
import {
  createPlayer,
  getPlayers,
  updatePlayer,
  deletePlayer,
  getRecentPlayers,
} from "@/lib/actions/players";
import { createGame } from "@/lib/actions/games";
```

Then add the test block:

```ts
describe("getRecentPlayers", () => {
  it("returns empty array when no games exist", async () => {
    await createPlayer("Alice");
    const recents = await getRecentPlayers();
    expect(recents).toEqual([]);
  });

  it("returns players ordered by most recent game appearance", async () => {
    const alice = await createPlayer("Alice");
    const bob = await createPlayer("Bob");
    const charlie = await createPlayer("Charlie");
    // Alice vs Bob (older game)
    await createGame(alice.id, bob.id, alice.id);
    // Charlie vs Alice (newer game)
    await createGame(charlie.id, alice.id, charlie.id);

    const recents = await getRecentPlayers();
    const names = recents.map((p) => p.name);
    // Charlie and Alice tied for most recent game, but both before Bob
    expect(names.indexOf("Bob")).toBeGreaterThan(names.indexOf("Charlie"));
    expect(names.indexOf("Bob")).toBeGreaterThan(names.indexOf("Alice"));
  });

  it("respects limit parameter", async () => {
    const alice = await createPlayer("Alice");
    const bob = await createPlayer("Bob");
    const charlie = await createPlayer("Charlie");
    await createGame(alice.id, bob.id, alice.id);
    await createGame(charlie.id, alice.id, charlie.id);

    const recents = await getRecentPlayers(2);
    expect(recents).toHaveLength(2);
  });

  it("only returns players who have played games", async () => {
    const alice = await createPlayer("Alice");
    const bob = await createPlayer("Bob");
    await createPlayer("Charlie"); // never plays a game
    await createGame(alice.id, bob.id, alice.id);

    const recents = await getRecentPlayers();
    const names = recents.map((p) => p.name);
    expect(names).toContain("Alice");
    expect(names).toContain("Bob");
    expect(names).not.toContain("Charlie");
  });

  it("includes players from in-progress games", async () => {
    const alice = await createPlayer("Alice");
    const bob = await createPlayer("Bob");
    // createGame creates an in-progress game by default
    await createGame(alice.id, bob.id, alice.id);

    const recents = await getRecentPlayers();
    const names = recents.map((p) => p.name);
    expect(names).toContain("Alice");
    expect(names).toContain("Bob");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/actions/players.test.ts`
Expected: FAIL — `getRecentPlayers` does not exist

- [ ] **Step 3: Implement `getRecentPlayers`**

Add to `src/lib/actions/players.ts`:

```ts
export async function getRecentPlayers(limit: number = 8) {
  // Get all game participant IDs with their most recent game date.
  // Two queries merged in JS since Prisma doesn't support UNION.
  const games = await db.game.findMany({
    select: {
      player1Id: true,
      player2Id: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Build map of playerId -> most recent game date
  const playerLastPlayed = new Map<number, Date>();
  for (const game of games) {
    for (const pid of [game.player1Id, game.player2Id]) {
      const existing = playerLastPlayed.get(pid);
      if (!existing || game.createdAt > existing) {
        playerLastPlayed.set(pid, game.createdAt);
      }
    }
  }

  if (playerLastPlayed.size === 0) return [];

  // Sort by most recent first, take limit
  const sortedIds = [...playerLastPlayed.entries()]
    .sort((a, b) => b[1].getTime() - a[1].getTime())
    .slice(0, limit)
    .map(([id]) => id);

  // Fetch full player objects (naturally excludes deleted players)
  const players = await db.player.findMany({
    where: { id: { in: sortedIds } },
  });

  // Re-sort to match the recency order (findMany doesn't guarantee order)
  const playerMap = new Map(players.map((p) => [p.id, p]));
  return sortedIds
    .map((id) => playerMap.get(id))
    .filter((p): p is NonNullable<typeof p> => p != null);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/actions/players.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/actions/players.ts tests/actions/players.test.ts
git commit -m "feat: add getRecentPlayers action for new game screen"
```

---

## Chunk 2: Client Component — `NewGameClient`

### Task 2: Create `NewGameClient` component with player selection step

**Files:**
- Create: `src/components/new-game-client.tsx`

- [ ] **Step 1: Create the component with player selection UI**

Create `src/components/new-game-client.tsx`:

```tsx
"use client";

import { useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createGame } from "@/lib/actions/games";
import Link from "next/link";

interface Player {
  id: number;
  name: string;
}

interface NewGameClientProps {
  players: Player[];
  recentPlayers: Player[];
  defaultPlayer1Id?: number;
  defaultPlayer2Id?: number;
}

export function NewGameClient({
  players,
  recentPlayers,
  defaultPlayer1Id,
  defaultPlayer2Id,
}: NewGameClientProps) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);

  // Resolve defaults from props
  const defaultP1 = defaultPlayer1Id
    ? players.find((p) => p.id === defaultPlayer1Id) ?? null
    : null;
  const defaultP2 = defaultPlayer2Id
    ? players.find((p) => p.id === defaultPlayer2Id) ?? null
    : null;

  const [player1, setPlayer1] = useState<Player | null>(defaultP1);
  const [player2, setPlayer2] = useState<Player | null>(defaultP2);
  const [searchQuery, setSearchQuery] = useState("");
  const [step, setStep] = useState<"select" | "confirm">(
    defaultP1 && defaultP2 ? "confirm" : "select"
  );
  const [hammer, setHammer] = useState<"random" | "player1" | "player2">("random");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter chips: exclude already-selected players
  const visibleChips = recentPlayers.filter(
    (p) => p.id !== player1?.id && p.id !== player2?.id
  );

  // Filter search results: substring match, exclude selected players
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return players.filter(
      (p) =>
        p.name.toLowerCase().includes(query) &&
        p.id !== player1?.id &&
        p.id !== player2?.id
    );
  }, [searchQuery, players, player1, player2]);

  function selectPlayer(player: Player) {
    // Blur search to dismiss mobile keyboard
    searchRef.current?.blur();
    setSearchQuery("");

    if (!player1) {
      setPlayer1(player);
      // If the other slot is already filled, auto-advance
      if (player2) {
        setStep("confirm");
      }
    } else if (!player2) {
      setPlayer2(player);
      setStep("confirm");
    }
  }

  function deselectPlayer(slot: "player1" | "player2") {
    if (slot === "player1") {
      setPlayer1(null);
    } else {
      setPlayer2(null);
    }
    setStep("select");
    setHammer("random");
  }

  function handleBack() {
    setPlayer2(null);
    setStep("select");
    setHammer("random");
  }

  async function handleStartGame() {
    if (!player1 || !player2) return;
    setIsSubmitting(true);
    try {
      let hammerPlayerId: number;
      if (hammer === "random") {
        hammerPlayerId = Math.random() < 0.5 ? player1.id : player2.id;
      } else if (hammer === "player1") {
        hammerPlayerId = player1.id;
      } else {
        hammerPlayerId = player2.id;
      }
      const game = await createGame(player1.id, player2.id, hammerPlayerId);
      router.push(`/game/${game.id}`);
    } catch {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">New Game</h1>
        {step === "confirm" ? (
          <button
            onClick={handleBack}
            className="text-sm text-[--text-dim]"
          >
            Back
          </button>
        ) : (
          <Link href="/">
            <Button variant="ghost" size="sm">Back</Button>
          </Link>
        )}
      </div>

      {/* Matchup Hero Card */}
      <div
        className="rounded-xl border border-border mb-6 p-6 text-center"
        style={{
          background: "linear-gradient(180deg, var(--card) 0%, var(--background) 100%)",
        }}
      >
        <div className="flex items-center justify-center gap-4">
          {/* Player 1 */}
          <button
            className="flex-1 text-center"
            onClick={() => player1 && deselectPlayer("player1")}
            disabled={!player1}
          >
            <div
              className="text-[10px] uppercase tracking-widest mb-1"
              style={{ color: player1 ? "var(--lead)" : "var(--text-dim)" }}
            >
              Player 1
            </div>
            {player1 ? (
              <div className="text-xl font-bold">{player1.name}</div>
            ) : (
              <div className="text-lg" style={{ color: "var(--text-dim)" }}>
                select below
              </div>
            )}
          </button>

          {/* VS Divider */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-px h-4" style={{ background: "var(--border)" }} />
            <div
              className="text-xs font-bold tracking-widest"
              style={{ color: "var(--rail-2)" }}
            >
              VS
            </div>
            <div className="w-px h-4" style={{ background: "var(--border)" }} />
          </div>

          {/* Player 2 */}
          <button
            className="flex-1 text-center"
            onClick={() => player2 && deselectPlayer("player2")}
            disabled={!player2}
          >
            <div
              className="text-[10px] uppercase tracking-widest mb-1"
              style={{ color: player2 ? "var(--lead)" : "var(--text-dim)" }}
            >
              Player 2
            </div>
            {player2 ? (
              <div className="text-xl font-bold">{player2.name}</div>
            ) : (
              <div className="text-lg" style={{ color: "var(--text-dim)" }}>
                select below
              </div>
            )}
          </button>
        </div>
      </div>

      {step === "select" && (
        <>
          {/* Recent Chips */}
          {visibleChips.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {visibleChips.map((player) => (
                <button
                  key={player.id}
                  onClick={() => selectPlayer(player)}
                  className="px-4 py-2 rounded-full bg-secondary text-foreground text-sm"
                >
                  {player.name}
                </button>
              ))}
            </div>
          )}

          {/* Search Bar */}
          <div className="relative mb-2">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[--text-dim] text-sm pointer-events-none">
              🔍
            </div>
            <input
              ref={searchRef}
              type="text"
              placeholder="Search all players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-3 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-[--text-dim]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[--text-dim] text-sm"
              >
                ✕
              </button>
            )}
          </div>

          {/* Search Results */}
          {searchQuery.trim() && (
            <div className="border border-border rounded-lg overflow-hidden">
              {searchResults.length === 0 ? (
                <div className="p-3 text-sm text-[--text-dim] text-center">
                  No players found
                </div>
              ) : (
                searchResults.map((player) => (
                  <button
                    key={player.id}
                    onClick={() => selectPlayer(player)}
                    className="w-full text-left px-4 py-3 text-sm border-b border-border last:border-b-0 hover:bg-secondary/50"
                  >
                    {player.name}
                  </button>
                ))
              )}
            </div>
          )}
        </>
      )}

      {step === "confirm" && player1 && player2 && (
        <>
          {/* Hammer Toggle */}
          <div className="mb-6">
            <div
              className="text-[11px] uppercase tracking-wider mb-2"
              style={{ color: "var(--muted-foreground)" }}
            >
              First Hammer
            </div>
            <div className="flex gap-2">
              {(["player1", "random", "player2"] as const).map((option) => {
                const isSelected = hammer === option;
                const label =
                  option === "random"
                    ? "🎲 Random"
                    : option === "player1"
                      ? player1.name
                      : player2.name;
                return (
                  <button
                    key={option}
                    onClick={() => setHammer(option)}
                    className="flex-1 py-2.5 rounded-lg text-sm text-center transition-colors"
                    style={{
                      background: "var(--secondary)",
                      border: isSelected
                        ? "2px solid var(--rail-2)"
                        : "1px solid var(--border)",
                      color: isSelected ? "var(--rail-2)" : "var(--foreground)",
                      fontWeight: isSelected ? 600 : 400,
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Start Game Button */}
          <Button
            onClick={handleStartGame}
            disabled={isSubmitting}
            className="w-full h-14 text-lg font-bold"
            size="lg"
            style={{
              background: "linear-gradient(135deg, var(--rail-2), var(--rail-3))",
              color: "#1a1400",
              border: "none",
              opacity: isSubmitting ? 0.6 : 1,
            }}
          >
            {isSubmitting ? "Starting..." : "Start Game"}
          </Button>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No type errors (or only pre-existing ones)

- [ ] **Step 3: Commit**

```bash
git add src/components/new-game-client.tsx
git commit -m "feat: add NewGameClient component for new game screen"
```

---

### Task 3: Rewire server page and delete old components

**Files:**
- Modify: `src/app/game/new/page.tsx`
- Delete: `src/components/player-picker.tsx`
- Delete: `src/components/hammer-picker.tsx`

- [ ] **Step 1: Rewrite the server page**

Replace `src/app/game/new/page.tsx` entirely:

```tsx
export const dynamic = "force-dynamic";

import { getPlayers, getRecentPlayers } from "@/lib/actions/players";
import { NewGameClient } from "@/components/new-game-client";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface Props {
  searchParams: Promise<{ p1?: string; p2?: string }>;
}

export default async function NewGamePage({ searchParams }: Props) {
  const { p1, p2 } = await searchParams;
  const [players, recentPlayers] = await Promise.all([
    getPlayers(),
    getRecentPlayers(),
  ]);

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
    <NewGameClient
      players={players}
      recentPlayers={recentPlayers}
      defaultPlayer1Id={p1 ? Number(p1) : undefined}
      defaultPlayer2Id={p2 ? Number(p2) : undefined}
    />
  );
}
```

- [ ] **Step 2: Delete old components**

```bash
rm src/components/player-picker.tsx src/components/hammer-picker.tsx
```

- [ ] **Step 3: Run the full test suite to verify nothing breaks**

Run: `npm test`
Expected: All 25 tests pass (no tests depended on the deleted components)

- [ ] **Step 4: Manual smoke test**

Run: `npm run dev`

Test in browser at `http://localhost:3000/game/new`:
1. Verify recent chips appear (if games exist) or just search bar shows
2. Tap a chip → assigns to P1 slot, name appears in hero card
3. Tap another → assigns to P2, auto-advances to hammer step
4. Tap a name in hero card → deselects, returns to select step
5. Back button on confirm step → preserves P1, clears P2
6. Search filters players as you type
7. Hammer toggle defaults to Random, tapping switches
8. Start Game creates game and navigates to game page
9. Test rematch: navigate to `/game/new?p1=1&p2=2` → both slots pre-filled, starts on confirm step
10. Back link on select step → returns to home page

- [ ] **Step 5: Commit**

```bash
git add src/app/game/new/page.tsx
git add -u src/components/player-picker.tsx src/components/hammer-picker.tsx
git commit -m "feat: rewire new game page to use NewGameClient, remove old pickers"
```

---

## Chunk 3: Build Verification

### Task 4: Production build and final check

**Files:** None (verification only)

- [ ] **Step 1: Run production build**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 2: Run full test suite**

Run: `npm test`
Expected: All tests pass (existing 25 + new `getRecentPlayers` tests)

- [ ] **Step 3: Commit any remaining changes**

If the build or tests revealed any issues that needed fixing, commit those fixes.
