# Game UI Fixes Round 2 — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix four usability issues found during playtesting: bigger End Round button, leading player indicator visible from both orientations, simultaneous multi-touch support, and more robust screen wake lock.

**Architecture:** All client-side UI changes. Ring buttons switch from `onClick` to `onTouchEnd`/`onPointerDown` for multi-touch. Wake lock adds a periodic re-acquire interval as a fallback. Leading indicator uses a colored border/glow on the center bar visible from both sides.

**Tech Stack:** React, Tailwind CSS, Screen Wake Lock API, touch events

---

## Issues

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| End Round button too small | `size="sm"` with `px-6` | Make it tall, full-width in center, visually dominant |
| Can't tell who's leading | Only raw numbers, no visual cue | Colored glow/border on the leading player's half + score comparison in center bar |
| Can't tap buttons simultaneously | `onClick` doesn't support multi-touch; `useTransition` serializes actions | Switch to `onPointerDown` events with `touch-action: manipulation`, fire actions independently without shared transition lock |
| Screen still turns off | Wake lock released on visibility change and not always re-acquired; some browsers need periodic poke | Add interval-based re-acquire every 30s as fallback, plus a `<meta>` viewport hint |

## File Structure

```
Modified files:
├── src/components/ring-button.tsx        # onPointerDown for multi-touch
├── src/components/player-half.tsx        # Leading indicator glow
├── src/components/center-bar.tsx         # Bigger End Round, score comparison
├── src/app/game/[id]/game-client.tsx     # Independent action dispatch, robust wake lock, pass leading info
└── src/app/layout.tsx                    # Add viewport meta for wake lock compatibility
```

---

## Chunk 1: All Fixes

### Task 1: Multi-touch Ring Buttons

**Files:**
- Modify: `src/components/ring-button.tsx`

The problem: `onClick` only fires for one touch at a time on mobile. When two players tap simultaneously, one tap gets swallowed. Fix: use `onPointerDown` which fires independently per pointer.

- [ ] **Step 1: Update ring button to use pointer events**

Replace `src/components/ring-button.tsx`:

```tsx
"use client";

import { useCallback, useRef } from "react";

interface RingButtonProps {
  value: number;
  onTap: () => void;
  disabled?: boolean;
}

const RING_COLORS: Record<number, string> = {
  20: "bg-[#ffd700] text-black shadow-[0_0_12px_rgba(255,215,0,0.4)]",
  15: "bg-[#c0392b] text-white shadow-[0_0_12px_rgba(192,57,43,0.4)]",
  10: "bg-[#2980b9] text-white shadow-[0_0_12px_rgba(41,128,185,0.4)]",
  5: "bg-[#27ae60] text-white shadow-[0_0_12px_rgba(39,174,96,0.4)]",
};

export function RingButton({ value, onTap, disabled }: RingButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();

    // Visual feedback
    const el = ref.current;
    if (el) {
      el.classList.add("scale-75", "brightness-150");
      setTimeout(() => {
        el.classList.remove("scale-75", "brightness-150");
      }, 150);
    }

    onTap();
  }, [disabled, onTap]);

  return (
    <button
      ref={ref}
      onPointerDown={handlePointerDown}
      disabled={disabled}
      style={{ touchAction: "manipulation" }}
      className={`
        w-20 h-20 rounded-full font-bold text-2xl select-none
        transition-all duration-150
        ${RING_COLORS[value] || "bg-gray-500 text-white"}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      {value}
    </button>
  );
}
```

Key changes:
- `onPointerDown` instead of `onClick` — fires per-pointer, supports simultaneous touches
- `touch-action: manipulation` — prevents browser zoom/scroll on double-tap
- `e.preventDefault()` + `e.stopPropagation()` — prevents ghost clicks
- Renamed `onClick` prop to `onTap` — signals that this isn't a standard click handler
- Visual feedback via direct DOM class manipulation (no re-render needed)

- [ ] **Step 2: Commit**

```bash
git add src/components/ring-button.tsx
git commit -m "feat: multi-touch ring buttons using pointer events"
```

---

### Task 2: Independent Action Dispatch + Leading Indicator + Robust Wake Lock

**Files:**
- Modify: `src/app/game/[id]/game-client.tsx`

The problem with simultaneous taps: `useTransition` creates a single pending state — when one tap is pending, the other player's buttons are disabled. Fix: fire disc-add actions independently without disabling the other player. Use `fetch` pattern instead of shared transition.

Also: pass leading/trailing info to player halves, and make wake lock more robust.

- [ ] **Step 1: Rewrite game client**

Replace `src/app/game/[id]/game-client.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useTransition, useEffect, useCallback } from "react";
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

  // Robust wake lock: acquire + re-acquire on visibility + periodic fallback
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;

    async function acquire() {
      try {
        if ("wakeLock" in navigator) {
          // Release old one if exists
          if (wakeLock) {
            try { await wakeLock.release(); } catch {}
          }
          wakeLock = await navigator.wakeLock.request("screen");
        }
      } catch {}
    }

    acquire();

    // Re-acquire on visibility change
    function onVisibility() {
      if (document.visibilityState === "visible") {
        acquire();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    // Periodic re-acquire every 30s as fallback
    interval = setInterval(acquire, 30_000);

    return () => {
      if (wakeLock) { try { wakeLock.release(); } catch {} }
      if (interval) clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
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

  // Determine who's leading
  const p1Total = game.player1Score + player1RoundScore;
  const p2Total = game.player2Score + player2RoundScore;
  const leader: "p1" | "p2" | "tied" =
    p1Total > p2Total ? "p1" : p2Total > p1Total ? "p2" : "tied";

  // Disc taps fire independently — no shared transition blocking
  const handleDiscTap = useCallback((playerId: number, ringValue: number) => {
    // Fire and refresh without blocking other taps
    addDisc(game.id, playerId, ringValue).then(() => {
      router.refresh();
    });
  }, [game.id, router]);

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
    <div className="h-dvh flex flex-col bg-background overflow-hidden select-none"
         style={{ touchAction: "manipulation" }}>
      {/* Player 1 (top, rotated 180deg) */}
      <div className={`flex-1 flex transition-colors duration-300 ${
        leader === "p1"
          ? "bg-gradient-to-b from-blue-900/60 to-blue-950/20"
          : "bg-gradient-to-b from-blue-950/30 to-background"
      }`}>
        <PlayerHalf
          name={game.player1.name}
          gameScore={game.player1Score}
          roundScore={player1RoundScore}
          hasHammer={currentRound?.hammerPlayerId === game.player1Id}
          isLeading={leader === "p1"}
          isRotated={true}
          onDiscTap={(v) => handleDiscTap(game.player1Id, v)}
          disabled={isGameOver}
        />
      </div>

      {/* Center bar with score comparison */}
      <CenterBar
        roundNumber={currentRound?.roundNumber ?? game.rounds.length}
        player1Name={game.player1.name}
        player2Name={game.player2.name}
        player1Total={p1Total}
        player2Total={p2Total}
        onEndRound={handleEndRound}
        onUndo={handleUndo}
        onUndoRound={handleUndoRound}
        canUndoRound={completedRoundCount > 0}
        disabled={isPending || isGameOver}
      />

      {/* Player 2 (bottom, normal orientation) */}
      <div className={`flex-1 flex transition-colors duration-300 ${
        leader === "p2"
          ? "bg-gradient-to-t from-red-900/60 to-red-950/20"
          : "bg-gradient-to-t from-red-950/30 to-background"
      }`}>
        <PlayerHalf
          name={game.player2.name}
          gameScore={game.player2Score}
          roundScore={player2RoundScore}
          hasHammer={currentRound?.hammerPlayerId === game.player2Id}
          isLeading={leader === "p2"}
          isRotated={false}
          onDiscTap={(v) => handleDiscTap(game.player2Id, v)}
          disabled={isGameOver}
        />
      </div>

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

Key changes:
- `handleDiscTap` uses fire-and-forget `addDisc().then(refresh)` instead of `startTransition` — both players can tap simultaneously without blocking each other
- `disabled` on PlayerHalf no longer includes `isPending` for disc taps (only game-over disables)
- Leading player's half gets a brighter background gradient
- Center bar receives score totals (game score + round score) for the comparison display
- Wake lock adds 30-second periodic re-acquire interval
- Root div has `touch-action: manipulation` and `select-none` to prevent zoom/text-selection

- [ ] **Step 2: Commit**

```bash
git add src/app/game/[id]/game-client.tsx
git commit -m "feat: independent multi-touch dispatch, leading indicator, robust wake lock"
```

---

### Task 3: Player Half with Leading Indicator

**Files:**
- Modify: `src/components/player-half.tsx`

- [ ] **Step 1: Add isLeading prop and visual indicator**

Replace `src/components/player-half.tsx`:

```tsx
"use client";

import { RingButton } from "./ring-button";

interface PlayerHalfProps {
  name: string;
  gameScore: number;
  roundScore: number;
  hasHammer: boolean;
  isLeading: boolean;
  isRotated: boolean;
  onDiscTap: (ringValue: number) => void;
  disabled?: boolean;
}

export function PlayerHalf({
  name,
  gameScore,
  roundScore,
  hasHammer,
  isLeading,
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
      {/* Name + badges */}
      <div className="flex items-center gap-2">
        <span className="text-sm uppercase tracking-widest text-muted-foreground">
          {name}
        </span>
        {hasHammer && (
          <span className="text-xs font-bold bg-amber-500 text-black px-2 py-0.5 rounded-full">
            HAMMER
          </span>
        )}
        {isLeading && (
          <span className="text-xs font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full">
            LEAD
          </span>
        )}
      </div>

      {/* Game Score */}
      <div className={`text-5xl font-bold tabular-nums ${isLeading ? "text-emerald-400" : ""}`}>
        {gameScore}
      </div>

      {/* Round Score */}
      <div className="text-3xl font-semibold text-primary tabular-nums">
        +{roundScore}
      </div>

      {/* Ring Buttons */}
      <div className="flex gap-4 mt-1">
        {ringValues.map((value) => (
          <RingButton
            key={value}
            value={value}
            onTap={() => onDiscTap(value)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}
```

Key changes:
- New `isLeading` prop
- Green "LEAD" badge next to name when leading
- Game score turns emerald green when leading — visible even upside-down
- `onClick` → `onTap` to match renamed RingButton prop
- Game score bumped back to `text-5xl` for visibility

- [ ] **Step 2: Commit**

```bash
git add src/components/player-half.tsx
git commit -m "feat: leading player indicator with green score and LEAD badge"
```

---

### Task 4: Better End Round Button + Score Comparison in Center Bar

**Files:**
- Modify: `src/components/center-bar.tsx`

- [ ] **Step 1: Redesign center bar**

Replace `src/components/center-bar.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui/button";

interface CenterBarProps {
  roundNumber: number;
  player1Name: string;
  player2Name: string;
  player1Total: number;
  player2Total: number;
  onEndRound: () => void;
  onUndo: () => void;
  onUndoRound: () => void;
  canUndoRound: boolean;
  disabled?: boolean;
}

export function CenterBar({
  roundNumber,
  player1Name,
  player2Name,
  player1Total,
  player2Total,
  onEndRound,
  onUndo,
  onUndoRound,
  canUndoRound,
  disabled,
}: CenterBarProps) {
  const diff = Math.abs(player1Total - player2Total);
  const leaderName = player1Total > player2Total
    ? player1Name
    : player2Total > player1Total
      ? player2Name
      : null;

  return (
    <div className="bg-muted/50 border-y border-border px-3 py-2 space-y-2">
      {/* Score comparison — readable from both orientations */}
      <div className="flex items-center justify-center gap-3 text-sm">
        <span className={`font-bold tabular-nums ${player1Total >= player2Total ? "text-emerald-400" : "text-muted-foreground"}`}>
          {player1Total}
        </span>
        <span className="text-muted-foreground">
          {leaderName ? `${leaderName} +${diff}` : "Tied"}
        </span>
        <span className={`font-bold tabular-nums ${player2Total >= player1Total ? "text-emerald-400" : "text-muted-foreground"}`}>
          {player2Total}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button onClick={onUndo} disabled={disabled} variant="outline" size="sm">
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
          className="px-8 h-10 text-base font-bold"
        >
          End Round
        </Button>

        <span className="text-sm font-medium text-muted-foreground min-w-[2rem] text-right">
          R{roundNumber}
        </span>
      </div>
    </div>
  );
}
```

Key changes:
- Score comparison line at top: shows both totals (game + round) and who leads by how much — visible to both players since it's in the center
- End Round button is taller (`h-10`), wider (`px-8`), bigger text (`text-base font-bold`)
- Score totals colored green for the leader

- [ ] **Step 2: Commit**

```bash
git add src/components/center-bar.tsx
git commit -m "feat: bigger End Round button with score comparison in center bar"
```

---

### Task 5: Build, Deploy, Verify

- [ ] **Step 1: Run tests**

Run: `npm test`
Expected: All 25 tests pass.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: Clean build.

- [ ] **Step 3: Deploy**

Run: `bash /Users/rob/env/deploy-unraid/deploy.sh crokinole`

- [ ] **Step 4: Smoke test on phone**

1. Start a game at http://10.0.0.10:3100
2. Both players tap ring buttons simultaneously — both should register
3. Leading player has green score, "LEAD" badge, brighter background
4. Center bar shows "PlayerName +N" with total scores
5. End Round button is large and easy to tap
6. Screen stays on for extended play
7. Undo Round still works correctly
