# Game UI Improvements Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix usability issues from real playtesting — bigger buttons, prominent round score, better undo, undo-round, hammer indicator, wake lock, and tap feedback.

**Architecture:** All changes are in the game UI components (client-side). One new server action (`undoRound`) for reverting a completed round. Wake lock via the browser Screen Wake Lock API.

**Tech Stack:** Next.js, React, Tailwind CSS, Screen Wake Lock API

---

## Issues to Fix

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| Buttons too small | `w-14 h-14` (56px) | Increase to `w-20 h-20` (80px) with larger text |
| Can't tell round score is incrementing | Small `text-sm` below buttons | Make round score large and prominent, add flash animation on change |
| Entered score wrong, can't go back | No undo-round capability | Add `undoRound` server action + UI button |
| Undo button too subtle | Tiny `text-xs` text link | Make it a proper button with an icon |
| Hammer indicator weak | Plain "Hammer" text in `text-sm` | Bold colored badge/icon |
| Screen turns off between rounds | No wake lock | Add Screen Wake Lock API |

## File Structure

```
Modified files:
├── src/components/ring-button.tsx        # Bigger buttons
├── src/components/player-half.tsx        # Prominent round score, hammer badge, tap flash
├── src/components/center-bar.tsx         # Better undo button, undo-round button
├── src/app/game/[id]/game-client.tsx     # Wake lock, undoRound handler
└── src/lib/actions/rounds.ts             # Add undoRound server action

Test files:
└── tests/actions/rounds.test.ts          # Add undoRound tests
```

---

## Chunk 1: Backend + UI Fixes

### Task 1: Add `undoRound` Server Action

**Files:**
- Modify: `src/lib/actions/rounds.ts`
- Modify: `tests/actions/rounds.test.ts`

- [ ] **Step 1: Write failing tests for undoRound**

Add to `tests/actions/rounds.test.ts`:

```ts
describe("undoRound", () => {
  it("reverts the last completed round and reopens it", async () => {
    // Play round 1: P1 scores 35 (20+15), P2 scores 10
    await addDisc(gameId, player1Id, 20);
    await addDisc(gameId, player1Id, 15);
    await addDisc(gameId, player2Id, 10);
    await endRound(gameId);

    // Game should show P1 at 25, round 2 in progress
    let game = await getGame(gameId);
    expect(game!.player1Score).toBe(25);
    expect(game!.rounds).toHaveLength(2);

    // Undo the round
    const result = await undoRound(gameId);
    expect(result).not.toBeNull();

    // Game should be back to 0-0, round 1 in progress with original discs
    game = await getGame(gameId);
    expect(game!.player1Score).toBe(0);
    expect(game!.player2Score).toBe(0);
    expect(game!.rounds).toHaveLength(1);
    expect(game!.rounds[0].status).toBe("in_progress");
    expect(game!.rounds[0].discs).toHaveLength(3);
  });

  it("returns null if only one round exists and it is in progress", async () => {
    // Round 1 is in progress, nothing to undo
    const result = await undoRound(gameId);
    expect(result).toBeNull();
  });

  it("does nothing on a completed game", async () => {
    // Play to completion
    await addDisc(gameId, player1Id, 20);
    await addDisc(gameId, player1Id, 20);
    await addDisc(gameId, player1Id, 20);
    await addDisc(gameId, player1Id, 20);
    await addDisc(gameId, player1Id, 20);
    await endRound(gameId);

    const game = await getGame(gameId);
    expect(game!.status).toBe("completed");

    const result = await undoRound(gameId);
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/actions/rounds.test.ts`
Expected: FAIL — `undoRound` is not exported.

- [ ] **Step 3: Implement undoRound**

Add to `src/lib/actions/rounds.ts` (add `undoRound` import in test file too):

```ts
export async function undoRound(gameId: number) {
  const game = await db.game.findUnique({
    where: { id: gameId },
    include: {
      rounds: {
        orderBy: { roundNumber: "desc" },
        take: 2,
        include: { discs: true },
      },
    },
  });

  if (!game || game.status === "completed") {
    return null;
  }

  const rounds = game.rounds;

  // Need at least 2 rounds: the current in-progress one and a completed one to revert
  if (rounds.length < 2) {
    return null;
  }

  const currentRound = rounds.find((r) => r.status === "in_progress");
  const lastCompletedRound = rounds.find((r) => r.status === "completed");

  if (!currentRound || !lastCompletedRound) {
    return null;
  }

  return db.$transaction(async (tx) => {
    // Delete the current in-progress round and its discs
    await tx.disc.deleteMany({ where: { roundId: currentRound.id } });
    await tx.round.delete({ where: { id: currentRound.id } });

    // Reopen the last completed round
    await tx.round.update({
      where: { id: lastCompletedRound.id },
      data: {
        status: "in_progress",
        player1RoundScore: 0,
        player2RoundScore: 0,
        pointsAwarded: 0,
        awardedToPlayerId: null,
      },
    });

    // Subtract the points that were awarded in that round from game scores
    const revertP1 = lastCompletedRound.awardedToPlayerId === game.player1Id
      ? lastCompletedRound.pointsAwarded
      : 0;
    const revertP2 = lastCompletedRound.awardedToPlayerId === game.player2Id
      ? lastCompletedRound.pointsAwarded
      : 0;

    await tx.game.update({
      where: { id: gameId },
      data: {
        player1Score: game.player1Score - revertP1,
        player2Score: game.player2Score - revertP2,
      },
    });

    return lastCompletedRound;
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/actions/rounds.test.ts`
Expected: All tests pass (existing + 3 new).

- [ ] **Step 5: Commit**

```bash
git add src/lib/actions/rounds.ts tests/actions/rounds.test.ts
git commit -m "feat: add undoRound server action to revert completed rounds"
```

---

### Task 2: Bigger Ring Buttons with Tap Feedback

**Files:**
- Modify: `src/components/ring-button.tsx`

- [ ] **Step 1: Update ring button sizing and add tap animation**

Replace `src/components/ring-button.tsx`:

```tsx
"use client";

import { useState } from "react";

interface RingButtonProps {
  value: number;
  onClick: () => void;
  disabled?: boolean;
}

const RING_COLORS: Record<number, string> = {
  20: "bg-[#ffd700] text-black shadow-[0_0_12px_rgba(255,215,0,0.4)]",
  15: "bg-[#c0392b] text-white shadow-[0_0_12px_rgba(192,57,43,0.4)]",
  10: "bg-[#2980b9] text-white shadow-[0_0_12px_rgba(41,128,185,0.4)]",
  5: "bg-[#27ae60] text-white shadow-[0_0_12px_rgba(39,174,96,0.4)]",
};

export function RingButton({ value, onClick, disabled }: RingButtonProps) {
  const [tapped, setTapped] = useState(false);

  function handleTap() {
    if (disabled) return;
    setTapped(true);
    onClick();
    setTimeout(() => setTapped(false), 150);
  }

  return (
    <button
      onClick={handleTap}
      disabled={disabled}
      className={`
        w-20 h-20 rounded-full font-bold text-2xl
        transition-all duration-150
        ${tapped ? "scale-75 brightness-150" : "active:scale-90"}
        ${RING_COLORS[value] || "bg-gray-500 text-white"}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      {value}
    </button>
  );
}
```

- [ ] **Step 2: Verify buttons render larger**

Run `npm run dev`, navigate to an active game. Buttons should be 80px circles with glow shadows and a visible scale-down + brighten on tap.

- [ ] **Step 3: Commit**

```bash
git add src/components/ring-button.tsx
git commit -m "feat: bigger ring buttons with tap feedback animation"
```

---

### Task 3: Prominent Round Score + Hammer Badge

**Files:**
- Modify: `src/components/player-half.tsx`

- [ ] **Step 1: Redesign player half with large round score and hammer badge**

Replace `src/components/player-half.tsx`:

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
        flex-1 flex flex-col items-center justify-center p-3 gap-1
        ${isRotated ? "rotate-180" : ""}
      `}
    >
      {/* Name + Hammer */}
      <div className="flex items-center gap-2">
        <span className="text-sm uppercase tracking-widest text-muted-foreground">
          {name}
        </span>
        {hasHammer && (
          <span className="text-xs font-bold bg-amber-500 text-black px-2 py-0.5 rounded-full">
            HAMMER
          </span>
        )}
      </div>

      {/* Game Score */}
      <div className="text-4xl font-bold">{gameScore}</div>

      {/* Round Score — large and prominent */}
      <div className="text-3xl font-semibold text-primary tabular-nums">
        +{roundScore}
      </div>

      {/* Ring Buttons */}
      <div className="flex gap-4 mt-1">
        {ringValues.map((value) => (
          <RingButton
            key={value}
            value={value}
            onClick={() => onDiscTap(value)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify visuals**

Run `npm run dev`. Each player half should show:
- Name with amber "HAMMER" badge (when they have hammer)
- Game score (slightly smaller than before to make room)
- Large "+0" round score in primary color that increments visibly on disc taps
- Bigger ring buttons with spacing

- [ ] **Step 3: Commit**

```bash
git add src/components/player-half.tsx
git commit -m "feat: prominent round score display and hammer badge"
```

---

### Task 4: Better Center Bar with Undo Round

**Files:**
- Modify: `src/components/center-bar.tsx`

- [ ] **Step 1: Redesign center bar with proper undo and undo-round buttons**

Replace `src/components/center-bar.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui/button";

interface CenterBarProps {
  roundNumber: number;
  onEndRound: () => void;
  onUndo: () => void;
  onUndoRound: () => void;
  canUndoRound: boolean;
  disabled?: boolean;
}

export function CenterBar({
  roundNumber,
  onEndRound,
  onUndo,
  onUndoRound,
  canUndoRound,
  disabled,
}: CenterBarProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-y border-border gap-2">
      <div className="flex gap-2">
        <Button
          onClick={onUndo}
          disabled={disabled}
          variant="outline"
          size="sm"
        >
          Undo
        </Button>
        {canUndoRound && (
          <Button
            onClick={onUndoRound}
            disabled={disabled}
            variant="outline"
            size="sm"
            className="text-destructive border-destructive/50"
          >
            Undo Round
          </Button>
        )}
      </div>

      <Button
        onClick={onEndRound}
        disabled={disabled}
        size="sm"
        className="px-6"
      >
        End Round
      </Button>

      <span className="text-sm font-medium text-muted-foreground min-w-[2rem] text-right">
        R{roundNumber}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/center-bar.tsx
git commit -m "feat: better center bar with proper undo and undo-round buttons"
```

---

### Task 5: Wake Lock + Wire Up Undo Round in Game Client

**Files:**
- Modify: `src/app/game/[id]/game-client.tsx`

- [ ] **Step 1: Add wake lock and undoRound handler**

Replace `src/app/game/[id]/game-client.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useTransition, useEffect } from "react";
import { PlayerHalf } from "@/components/player-half";
import { CenterBar } from "@/components/center-bar";
import { GameOverDialog } from "@/components/game-over-dialog";
import { addDisc, undoDisc, endRound, undoRound } from "@/lib/actions/rounds";

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

  // Keep screen on during gameplay
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;

    async function requestWakeLock() {
      try {
        if ("wakeLock" in navigator) {
          wakeLock = await navigator.wakeLock.request("screen");
        }
      } catch {
        // Wake lock request failed (e.g., low battery)
      }
    }

    requestWakeLock();

    // Re-acquire on visibility change (e.g., tab switch back)
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        requestWakeLock();
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      wakeLock?.release();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const currentRound = game.rounds.find((r) => r.status === "in_progress");
  const isGameOver = game.status === "completed";
  const completedRoundCount = game.rounds.filter((r) => r.status === "completed").length;

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

  function handleUndoRound() {
    startTransition(async () => {
      await undoRound(game.id);
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
        onUndoRound={handleUndoRound}
        canUndoRound={completedRoundCount > 0}
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

- [ ] **Step 2: Run full test suite**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/app/game/[id]/game-client.tsx
git commit -m "feat: add wake lock, undo-round handler, and wire up new center bar"
```

---

### Task 6: Build, Deploy, Verify

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: Clean build.

- [ ] **Step 3: Deploy to Unraid**

Run: `bash /Users/rob/env/deploy-unraid/deploy.sh crokinole`
Expected: Container running, accessible at http://10.0.0.10:3100.

- [ ] **Step 4: Smoke test on phone**

1. Open http://10.0.0.10:3100 on phone
2. Start a game
3. Verify: screen stays on
4. Verify: ring buttons are large and easy to tap
5. Verify: round score "+0" is large and increments visibly
6. Verify: hammer badge is a colored pill, not plain text
7. Verify: Undo button is a proper button
8. Tap some discs, tap End Round
9. Verify: "Undo Round" button appears in center bar
10. Tap Undo Round — verify previous round reopens with its discs
