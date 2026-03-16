# UX Overhaul Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Comprehensive UX overhaul based on 10-reviewer audit — optimistic updates, round-end summary, exit menu, game detail view, bigger touch targets, browser gesture prevention, first-time flow, player deletion guard, ARIA labels, error boundaries, and stats optimization.

**Architecture:** Optimistic state management in game-client via `useState` overlay on server data. New round-summary and exit-menu dialog components. Game detail view reuses the existing `/game/[id]` route by detecting completed games. Error boundaries via Next.js `error.tsx` convention.

**Tech Stack:** Next.js App Router, React, Tailwind CSS, Prisma, shadcn/ui Dialog

---

## File Structure

```
New files:
├── src/components/round-summary-dialog.tsx    # Shows round outcome before advancing
├── src/components/exit-menu-dialog.tsx         # Exit/pause menu during gameplay
├── src/app/game/[id]/game-detail.tsx           # Read-only completed game view
├── src/app/error.tsx                           # Root error boundary
├── src/app/game/[id]/error.tsx                 # Game error boundary

Modified files:
├── src/app/game/[id]/game-client.tsx           # Optimistic updates, round summary state, exit menu
├── src/app/game/[id]/page.tsx                  # Route to detail view for completed games
├── src/components/player-half.tsx              # Bigger undo, ARIA labels
├── src/components/center-bar.tsx               # Bigger End Round, ARIA
├── src/components/ring-button.tsx              # ARIA label, pointer cancel cleanup
├── src/components/game-over-dialog.tsx         # Add "View Details" option
├── src/app/page.tsx                            # Smart first-time flow, clickable recent games
├── src/app/game/new/page.tsx                   # Guide from home when no players
├── src/app/layout.tsx                          # Viewport meta for mobile
├── src/lib/actions/players.ts                  # Deletion guard
├── src/lib/actions/stats.ts                    # N+1 fix with select
```

---

## Chunk 1: Core Game UX

### Task 1: Optimistic Disc Updates

The biggest perceived performance improvement. Show score increment instantly on tap, confirm with server in background.

**Files:**
- Modify: `src/app/game/[id]/game-client.tsx`

- [ ] **Step 1: Rewrite game-client with optimistic state**

Replace `src/app/game/[id]/game-client.tsx` with the version below. Key changes:
- `useState` holds local disc overlay for the current round
- `handleDiscTap` updates local state immediately, then fires server action
- `handleUndo` removes from local state immediately, then fires server action
- `router.refresh()` only called for `endRound` and `undoRound` (full state changes)
- Request queue prevents out-of-order processing

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useTransition, useEffect, useCallback, useState, useRef } from "react";
import { PlayerHalf } from "@/components/player-half";
import { CenterBar } from "@/components/center-bar";
import { GameOverDialog } from "@/components/game-over-dialog";
import { RoundSummaryDialog } from "@/components/round-summary-dialog";
import { ExitMenuDialog } from "@/components/exit-menu-dialog";
import { addDisc, undoDisc, endRound, undoRound } from "@/lib/actions/rounds";

interface Disc {
  id: number;
  playerId: number;
  ringValue: number;
}

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
    player1RoundScore: number;
    player2RoundScore: number;
    pointsAwarded: number;
    awardedToPlayerId: number | null;
    discs: Disc[];
  }>;
}

interface GameClientProps {
  game: GameData;
}

interface RoundResult {
  roundNumber: number;
  player1Name: string;
  player2Name: string;
  player1RoundScore: number;
  player2RoundScore: number;
  pointsAwarded: number;
  winnerName: string | null;
  newPlayer1Score: number;
  newPlayer2Score: number;
}

export function GameClient({ game }: GameClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [localDiscs, setLocalDiscs] = useState<Disc[]>([]);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [showExitMenu, setShowExitMenu] = useState(false);
  const nextLocalId = useRef(-1);

  // Sync local discs from server state when game data changes
  useEffect(() => {
    const currentRound = game.rounds.find((r) => r.status === "in_progress");
    setLocalDiscs(currentRound?.discs ?? []);
  }, [game]);

  // Wake lock
  useEffect(() => {
    let noSleepInstance: { enable: () => void; disable: () => void } | null = null;
    let wakeLock: WakeLockSentinel | null = null;
    let activated = false;

    async function activate() {
      if (activated) return;
      activated = true;
      const NoSleep = (await import("nosleep.js")).default;
      noSleepInstance = new NoSleep();
      noSleepInstance.enable();
      try {
        if ("wakeLock" in navigator) {
          wakeLock = await navigator.wakeLock.request("screen");
        }
      } catch {}
    }

    function onInteraction() {
      activate();
    }
    document.addEventListener("pointerdown", onInteraction, { once: true });
    document.addEventListener("touchstart", onInteraction, { once: true });

    function onVisibility() {
      if (document.visibilityState === "visible" && activated) {
        noSleepInstance?.enable();
        navigator.wakeLock?.request("screen").then((wl) => { wakeLock = wl; }).catch(() => {});
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      noSleepInstance?.disable();
      if (wakeLock) { try { wakeLock.release(); } catch {} }
      document.removeEventListener("pointerdown", onInteraction);
      document.removeEventListener("touchstart", onInteraction);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const currentRound = game.rounds.find((r) => r.status === "in_progress");
  const isGameOver = game.status === "completed";
  const completedRoundCount = game.rounds.filter((r) => r.status === "completed").length;

  // Use local discs for scores (optimistic)
  const player1RoundScore = localDiscs
    .filter((d) => d.playerId === game.player1Id)
    .reduce((sum, d) => sum + d.ringValue, 0);

  const player2RoundScore = localDiscs
    .filter((d) => d.playerId === game.player2Id)
    .reduce((sum, d) => sum + d.ringValue, 0);

  const p1Total = game.player1Score + player1RoundScore;
  const p2Total = game.player2Score + player2RoundScore;
  const leader: "p1" | "p2" | "tied" =
    p1Total > p2Total ? "p1" : p2Total > p1Total ? "p2" : "tied";

  // Optimistic disc tap — update UI instantly, sync with server
  const handleDiscTap = useCallback((playerId: number, ringValue: number) => {
    const tempId = nextLocalId.current--;
    setLocalDiscs((prev) => [...prev, { id: tempId, playerId, ringValue }]);
    addDisc(game.id, playerId, ringValue).catch(() => {
      // Revert on failure
      setLocalDiscs((prev) => prev.filter((d) => d.id !== tempId));
    });
  }, [game.id]);

  // Optimistic undo — remove from local state instantly
  const handleUndo = useCallback((playerId: number) => {
    setLocalDiscs((prev) => {
      const idx = [...prev].reverse().findIndex((d) => d.playerId === playerId);
      if (idx === -1) return prev;
      const actualIdx = prev.length - 1 - idx;
      return prev.filter((_, i) => i !== actualIdx);
    });
    undoDisc(game.id, playerId).catch(() => {
      // On failure, refresh to get true state
      router.refresh();
    });
  }, [game.id, router]);

  // End round — show summary, then advance
  function handleEndRound() {
    // Capture current round scores for the summary
    const p1Rs = player1RoundScore;
    const p2Rs = player2RoundScore;
    const diff = Math.abs(p1Rs - p2Rs);
    const winnerName = p1Rs > p2Rs ? game.player1.name
      : p2Rs > p1Rs ? game.player2.name
      : null;

    startTransition(async () => {
      await endRound(game.id);

      // Show round summary
      setRoundResult({
        roundNumber: currentRound?.roundNumber ?? 1,
        player1Name: game.player1.name,
        player2Name: game.player2.name,
        player1RoundScore: p1Rs,
        player2RoundScore: p2Rs,
        pointsAwarded: diff,
        winnerName,
        newPlayer1Score: game.player1Score + (p1Rs > p2Rs ? diff : 0),
        newPlayer2Score: game.player2Score + (p2Rs > p1Rs ? diff : 0),
      });
    });
  }

  function handleDismissRoundResult() {
    setRoundResult(null);
    router.refresh();
  }

  function handleUndoRound() {
    startTransition(async () => {
      await undoRound(game.id);
      router.refresh();
    });
  }

  return (
    <div className="h-dvh flex flex-col bg-background overflow-hidden select-none"
         style={{ touchAction: "manipulation", overscrollBehavior: "none" }}>
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
          onUndo={() => handleUndo(game.player1Id)}
          disabled={isGameOver || isPending}
        />
      </div>

      {/* Center bar */}
      <CenterBar
        roundNumber={currentRound?.roundNumber ?? game.rounds.length}
        player1Name={game.player1.name}
        player2Name={game.player2.name}
        player1Total={p1Total}
        player2Total={p2Total}
        onEndRound={handleEndRound}
        onUndoRound={handleUndoRound}
        onMenuOpen={() => setShowExitMenu(true)}
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
          onUndo={() => handleUndo(game.player2Id)}
          disabled={isGameOver || isPending}
        />
      </div>

      {/* Round summary dialog */}
      <RoundSummaryDialog
        result={roundResult}
        onDismiss={handleDismissRoundResult}
      />

      {/* Exit menu */}
      <ExitMenuDialog
        open={showExitMenu}
        onClose={() => setShowExitMenu(false)}
        gameId={game.id}
      />

      {/* Game over dialog */}
      <GameOverDialog
        open={isGameOver && !roundResult}
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

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: All 25 tests pass (server actions unchanged).

- [ ] **Step 3: Commit**

```bash
git add src/app/game/[id]/game-client.tsx
git commit -m "feat: optimistic disc updates, round summary state, exit menu state"
```

---

### Task 2: Round Summary Dialog

**Files:**
- Create: `src/components/round-summary-dialog.tsx`

- [ ] **Step 1: Create the round summary dialog**

```tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RoundResult {
  roundNumber: number;
  player1Name: string;
  player2Name: string;
  player1RoundScore: number;
  player2RoundScore: number;
  pointsAwarded: number;
  winnerName: string | null;
  newPlayer1Score: number;
  newPlayer2Score: number;
}

interface RoundSummaryDialogProps {
  result: RoundResult | null;
  onDismiss: () => void;
}

export function RoundSummaryDialog({ result, onDismiss }: RoundSummaryDialogProps) {
  if (!result) return null;

  return (
    <Dialog open={true}>
      <DialogContent className="text-center max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-xl">Round {result.roundNumber}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Round scores */}
          <div className="flex items-center justify-center gap-6 text-2xl font-bold tabular-nums">
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">{result.player1Name}</div>
              <div>{result.player1RoundScore}</div>
            </div>
            <div className="text-muted-foreground">vs</div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">{result.player2Name}</div>
              <div>{result.player2RoundScore}</div>
            </div>
          </div>

          {/* Outcome */}
          <div className="text-lg">
            {result.winnerName ? (
              <span className="text-emerald-400 font-semibold">
                {result.winnerName} +{result.pointsAwarded}
              </span>
            ) : (
              <span className="text-muted-foreground">Tied round</span>
            )}
          </div>

          {/* New game scores */}
          <div className="text-sm text-muted-foreground">
            Game: {result.player1Name} {result.newPlayer1Score} — {result.newPlayer2Score} {result.player2Name}
          </div>
        </div>

        <Button onClick={onDismiss} className="w-full" size="lg">
          Next Round
        </Button>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/round-summary-dialog.tsx
git commit -m "feat: round summary dialog showing scores and outcome"
```

---

### Task 3: Exit Menu Dialog

**Files:**
- Create: `src/components/exit-menu-dialog.tsx`

- [ ] **Step 1: Create the exit menu**

```tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ExitMenuDialogProps {
  open: boolean;
  onClose: () => void;
  gameId: number;
}

export function ExitMenuDialog({ open, onClose, gameId }: ExitMenuDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>Game Menu</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-2">
          <Button onClick={onClose} size="lg" className="w-full">
            Resume Game
          </Button>
          <a href="/">
            <Button variant="outline" size="lg" className="w-full">
              Save & Exit
            </Button>
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/exit-menu-dialog.tsx
git commit -m "feat: exit menu dialog for pausing and leaving games"
```

---

### Task 4: Update Center Bar — Menu Button, Bigger End Round

**Files:**
- Modify: `src/components/center-bar.tsx`

- [ ] **Step 1: Add menu button and increase End Round size**

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
  onUndoRound: () => void;
  onMenuOpen: () => void;
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
  onUndoRound,
  onMenuOpen,
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
      {/* Score comparison */}
      <div className="flex items-center justify-center gap-3 text-sm" aria-live="polite">
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
          <Button
            onClick={onMenuOpen}
            variant="ghost"
            size="sm"
            aria-label="Game menu"
            className="px-2"
          >
            Menu
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
          className="px-8 min-h-[48px] text-base font-bold"
          aria-label="End the current round"
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

- [ ] **Step 2: Commit**

```bash
git add src/components/center-bar.tsx
git commit -m "feat: add menu button, 48px End Round, ARIA labels in center bar"
```

---

### Task 5: Bigger Undo Button + ARIA in Player Half

**Files:**
- Modify: `src/components/player-half.tsx`

- [ ] **Step 1: Increase undo size and add ARIA**

Replace `src/components/player-half.tsx`:

```tsx
"use client";

import { RingButton } from "./ring-button";
import { Button } from "@/components/ui/button";

interface PlayerHalfProps {
  name: string;
  gameScore: number;
  roundScore: number;
  hasHammer: boolean;
  isLeading: boolean;
  isRotated: boolean;
  onDiscTap: (ringValue: number) => void;
  onUndo: () => void;
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
  onUndo,
  disabled,
}: PlayerHalfProps) {
  const ringValues = isRotated ? [5, 10, 15, 20] : [20, 15, 10, 5];

  return (
    <div
      className={`
        flex-1 flex flex-col items-center justify-center p-3 gap-1
        ${isRotated ? "rotate-180" : ""}
      `}
      aria-label={`${name}'s scoring area`}
    >
      {/* Name + badges */}
      <div className="flex items-center gap-2">
        <span className="text-sm uppercase tracking-widest text-muted-foreground">
          {name}
        </span>
        {hasHammer && (
          <span className="text-xs font-bold bg-amber-500 text-black px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(217,119,6,0.5)]" role="status">
            HAMMER
          </span>
        )}
        {isLeading && (
          <span className="text-xs font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full" role="status">
            LEAD
          </span>
        )}
      </div>

      {/* Game Score */}
      <div
        className={`text-5xl font-bold tabular-nums ${isLeading ? "text-emerald-400" : ""}`}
        aria-label={`Game score: ${gameScore}`}
        role="status"
      >
        {gameScore}
      </div>

      {/* Round Score */}
      <div
        className="text-3xl font-semibold text-primary tabular-nums"
        aria-label={`Round score: ${roundScore}`}
        aria-live="polite"
      >
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

      {/* Undo — 48px minimum */}
      <Button
        onClick={onUndo}
        disabled={disabled || roundScore === 0}
        variant="outline"
        className="mt-2 min-h-[48px] px-6"
        aria-label={`Undo ${name}'s last disc`}
      >
        Undo
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/player-half.tsx
git commit -m "feat: 48px undo button, hammer glow, ARIA labels on player half"
```

---

### Task 6: Ring Button ARIA + Pointer Cancel

**Files:**
- Modify: `src/components/ring-button.tsx`

- [ ] **Step 1: Add ARIA label and pointer cancel cleanup**

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

    const el = ref.current;
    if (el) {
      el.classList.add("scale-75", "brightness-150");
      setTimeout(() => {
        el.classList.remove("scale-75", "brightness-150");
      }, 150);
    }

    onTap();
  }, [disabled, onTap]);

  const handlePointerCancel = useCallback(() => {
    ref.current?.classList.remove("scale-75", "brightness-150");
  }, []);

  return (
    <button
      ref={ref}
      onPointerDown={handlePointerDown}
      onPointerCancel={handlePointerCancel}
      disabled={disabled}
      style={{ touchAction: "manipulation" }}
      aria-label={`Score ${value} points`}
      className={`
        w-20 h-20 rounded-full font-bold text-2xl select-none
        transition-all duration-150
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring
        ${RING_COLORS[value] || "bg-gray-500 text-white"}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      {value}
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ring-button.tsx
git commit -m "feat: ARIA label, pointer cancel cleanup, focus-visible on ring buttons"
```

---

## Chunk 2: Navigation, Home, Game Detail

### Task 7: Viewport Meta + Layout

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Add viewport meta for mobile**

Replace `src/app/layout.tsx`:

```tsx
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Crokinole Scorekeeper",
  description: "Keep score for your crokinole games",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
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

- [ ] **Step 2: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: add viewport meta to prevent zoom and enable viewport-fit"
```

---

### Task 8: Smart Home Screen + Clickable Recent Games

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add first-time guidance and clickable game cards**

Replace `src/app/page.tsx`:

```tsx
import { getRecentGames, getInProgressGames } from "@/lib/actions/games";
import { getPlayers } from "@/lib/actions/players";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default async function HomePage() {
  const [recentGames, inProgressGames, players] = await Promise.all([
    getRecentGames(),
    getInProgressGames(),
    getPlayers(),
  ]);

  const needsPlayers = players.length < 2;

  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto">
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold mb-2">Crokinole</h1>
        <p className="text-muted-foreground">Scorekeeper</p>
      </div>

      <div className="space-y-3 mb-8">
        {needsPlayers ? (
          <>
            <Link href="/players" className="block">
              <Button className="w-full h-14 text-lg" size="lg">
                Add Players to Get Started
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground text-center">
              Add at least 2 players to start a game
            </p>
          </>
        ) : (
          <Link href="/game/new" className="block">
            <Button className="w-full h-14 text-lg" size="lg">
              New Game
            </Button>
          </Link>
        )}
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
                      <span className="text-xs text-primary">Tap to resume</span>
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
              <Link key={game.id} href={`/game/${game.id}`}>
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
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
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: smart home screen with first-time guidance and clickable game cards"
```

---

### Task 9: Game Detail View for Completed Games

**Files:**
- Create: `src/app/game/[id]/game-detail.tsx`
- Modify: `src/app/game/[id]/page.tsx`

- [ ] **Step 1: Create game detail component**

Create `src/app/game/[id]/game-detail.tsx`:

```tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

interface GameDetailProps {
  game: {
    id: number;
    player1Score: number;
    player2Score: number;
    player1: { id: number; name: string };
    player2: { id: number; name: string };
    winner: { name: string } | null;
    rounds: Array<{
      roundNumber: number;
      player1RoundScore: number;
      player2RoundScore: number;
      pointsAwarded: number;
      awardedToPlayerId: number | null;
      hammerPlayerId: number;
    }>;
    createdAt: Date;
  };
}

export function GameDetail({ game }: GameDetailProps) {
  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Game Details</h1>
        <Link href="/">
          <Button variant="ghost" size="sm">Back</Button>
        </Link>
      </div>

      {/* Final Score */}
      <Card className="mb-6">
        <CardContent className="p-6 text-center">
          {game.winner && (
            <div className="text-lg text-emerald-400 font-semibold mb-2">
              {game.winner.name} Wins!
            </div>
          )}
          <div className="flex items-center justify-center gap-6 text-3xl font-bold tabular-nums">
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-1">{game.player1.name}</div>
              <div>{game.player1Score}</div>
            </div>
            <div className="text-muted-foreground text-lg">—</div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-1">{game.player2.name}</div>
              <div>{game.player2Score}</div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-3">
            {new Date(game.createdAt).toLocaleDateString()} — {game.rounds.length} rounds
          </div>
        </CardContent>
      </Card>

      {/* Round-by-round breakdown */}
      <h2 className="text-lg font-semibold mb-3">Rounds</h2>
      <div className="space-y-2">
        {game.rounds.map((round) => {
          const p1Won = round.awardedToPlayerId === game.player1.id;
          const p2Won = round.awardedToPlayerId === game.player2.id;
          const hadHammer = round.hammerPlayerId === game.player1.id
            ? game.player1.name : game.player2.name;

          return (
            <Card key={round.roundNumber}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground w-8">R{round.roundNumber}</span>
                  <div className="flex items-center gap-4 tabular-nums">
                    <span className={`font-semibold ${p1Won ? "text-emerald-400" : ""}`}>
                      {round.player1RoundScore}
                    </span>
                    <span className="text-xs text-muted-foreground">vs</span>
                    <span className={`font-semibold ${p2Won ? "text-emerald-400" : ""}`}>
                      {round.player2RoundScore}
                    </span>
                  </div>
                  <div className="text-right text-xs text-muted-foreground w-20">
                    {round.pointsAwarded > 0 ? (
                      <span className="text-emerald-400">+{round.pointsAwarded}</span>
                    ) : (
                      "Tie"
                    )}
                    <div className="text-[10px]">{hadHammer} H</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-6">
        <a href={`/game/new?p1=${game.player1.id}&p2=${game.player2.id}`} className="flex-1">
          <Button className="w-full" size="lg">Rematch</Button>
        </a>
        <Link href="/stats" className="flex-1">
          <Button variant="secondary" className="w-full" size="lg">Stats</Button>
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update game page to route completed games to detail view**

Replace `src/app/game/[id]/page.tsx`:

```tsx
import { getGame } from "@/lib/actions/games";
import { notFound } from "next/navigation";
import { GameClient } from "./game-client";
import { GameDetail } from "./game-detail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function GamePage({ params }: Props) {
  const { id } = await params;
  const game = await getGame(Number(id));

  if (!game) {
    notFound();
  }

  if (game.status === "completed") {
    return <GameDetail game={game} />;
  }

  return <GameClient game={game} />;
}
```

- [ ] **Step 3: Update GameOverDialog to include View Details**

Replace `src/components/game-over-dialog.tsx`:

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
import { useRouter } from "next/navigation";

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
  const router = useRouter();

  return (
    <Dialog open={open}>
      <DialogContent className="text-center">
        <DialogHeader>
          <DialogTitle className="text-3xl">{winnerName} Wins!</DialogTitle>
          <DialogDescription className="text-lg mt-2">
            {player1Name} {player1Score} — {player2Score} {player2Name}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-4">
          <a href={`/game/new?p1=${player1Id}&p2=${player2Id}`}>
            <Button className="w-full" size="lg">
              Rematch
            </Button>
          </a>
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => router.refresh()}
          >
            View Details
          </Button>
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

"View Details" calls `router.refresh()` which re-renders the page — since the game is now completed, `page.tsx` will render `GameDetail` instead of `GameClient`.

- [ ] **Step 4: Commit**

```bash
git add src/app/game/[id]/game-detail.tsx src/app/game/[id]/page.tsx src/components/game-over-dialog.tsx
git commit -m "feat: game detail view for completed games with round-by-round breakdown"
```

---

## Chunk 3: Guards, Errors, Stats

### Task 10: Player Deletion Guard

**Files:**
- Modify: `src/lib/actions/players.ts`

- [ ] **Step 1: Add active game check before deletion**

Replace `deletePlayer` in `src/lib/actions/players.ts`:

```ts
export async function deletePlayer(id: number) {
  const activeGames = await db.game.count({
    where: {
      status: "in_progress",
      OR: [{ player1Id: id }, { player2Id: id }],
    },
  });
  if (activeGames > 0) {
    throw new Error("Cannot delete player with active games");
  }
  return db.player.delete({ where: { id } });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/actions/players.ts
git commit -m "feat: guard player deletion when in active games"
```

---

### Task 11: Error Boundaries

**Files:**
- Create: `src/app/error.tsx`, `src/app/game/[id]/error.tsx`

- [ ] **Step 1: Create root error boundary**

Create `src/app/error.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground">
      <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
      <p className="text-muted-foreground mb-6">An unexpected error occurred.</p>
      <div className="flex gap-3">
        <Button onClick={reset}>Try Again</Button>
        <a href="/"><Button variant="secondary">Home</Button></a>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create game error boundary**

Create `src/app/game/[id]/error.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui/button";

export default function GameError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground">
      <h1 className="text-2xl font-bold mb-4">Game Not Found</h1>
      <p className="text-muted-foreground mb-6">Unable to load this game.</p>
      <div className="flex gap-3">
        <Button onClick={reset}>Retry</Button>
        <a href="/"><Button variant="secondary">Home</Button></a>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/error.tsx src/app/game/[id]/error.tsx
git commit -m "feat: add error boundaries for graceful error handling"
```

---

### Task 12: Stats Query Optimization

**Files:**
- Modify: `src/lib/actions/stats.ts`

- [ ] **Step 1: Fix N+1 with select instead of include**

In `src/lib/actions/stats.ts`, replace the rounds query in `getPlayerStats`:

Find and replace the `db.round.findMany` call (the one that includes `game`) with:

```ts
  const rounds = await db.round.findMany({
    where: {
      status: "completed",
      game: {
        status: "completed",
        OR: [{ player1Id: playerId }, { player2Id: playerId }],
      },
    },
    select: {
      player1RoundScore: true,
      player2RoundScore: true,
      game: { select: { player1Id: true } },
    },
  });
```

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: All 25 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/stats.ts
git commit -m "perf: fix N+1 query in stats with select instead of include"
```

---

### Task 13: Build, Deploy, Verify

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: Clean build.

- [ ] **Step 3: Deploy**

Run: `bash /Users/rob/env/deploy-unraid/deploy.sh crokinole`

- [ ] **Step 4: Smoke test**

1. Open http://10.0.0.10:3100 on phone
2. **First-time flow:** If no players, primary button says "Add Players to Get Started"
3. **Start a game:** Tap discs — scores update INSTANTLY (optimistic)
4. **End round:** Summary dialog shows "Round 1: Alice 35 vs Bob 20 — Alice +15"
5. **Tap "Next Round"** to continue
6. **Menu button** in center bar opens exit dialog with Resume / Save & Exit
7. **Undo button** is big (48px), undo round still works
8. **End Round button** is 48px tall, easy to hit
9. **Play to 100:** Game over dialog has Rematch / View Details / Home
10. **View Details** shows round-by-round breakdown with hammer info
11. **Home screen** recent games are clickable — tap one to see details
12. **Can't pinch-zoom** on the game screen
13. **Screen stays on**
