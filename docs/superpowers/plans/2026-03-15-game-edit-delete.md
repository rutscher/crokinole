# Game Edit & Delete Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add delete and edit-score capabilities to the game detail page.

**Architecture:** Two new server actions (`deleteGame`, `updateGameScore`) in the existing `games.ts` actions file. Two new client dialog components (`DeleteGameDialog`, `EditScoreDialog`) following the existing dialog pattern (`ExitMenuDialog`, `GameOverDialog`). The `GameDetail` component gets both buttons; `GameClient` (in-progress games) gets only the delete button via `ExitMenuDialog` enhancement or a standalone button.

**Tech Stack:** Next.js 16 App Router, Prisma 7, React 19, shadcn/ui Dialog, Tailwind 4

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/actions/games.ts` | Modify | Add `deleteGame` and `updateGameScore` server actions |
| `src/components/delete-game-dialog.tsx` | Create | Confirmation dialog that calls `deleteGame` |
| `src/components/edit-score-dialog.tsx` | Create | Score editing dialog that calls `updateGameScore` |
| `src/app/game/[id]/game-detail.tsx` | Modify | Add Edit Score + Delete Game buttons, import dialogs, convert to client component |
| `tests/actions/games.test.ts` | Modify | Add tests for `deleteGame` and `updateGameScore` |

---

## Chunk 1: Server Actions + Tests

### Task 1: deleteGame server action

**Files:**
- Modify: `src/lib/actions/games.ts`
- Modify: `tests/actions/games.test.ts`

- [ ] **Step 1: Write failing tests for deleteGame**

Add these tests to `tests/actions/games.test.ts`:

```typescript
import { createPlayer } from "@/lib/actions/players";
import { createGame, getGame, deleteGame } from "@/lib/actions/games";
import { addDisc, endRound } from "@/lib/actions/rounds";

// ... existing beforeEach and tests ...

describe("deleteGame", () => {
  it("deletes a game with no rounds played", async () => {
    const game = await createGame(player1Id, player2Id, player1Id);
    await deleteGame(game.id);
    const result = await getGame(game.id);
    expect(result).toBeNull();
  });

  it("deletes a game with rounds and discs", async () => {
    const game = await createGame(player1Id, player2Id, player1Id);
    await addDisc(game.id, player1Id, 20);
    await addDisc(game.id, player2Id, 15);
    await endRound(game.id);
    await deleteGame(game.id);
    const result = await getGame(game.id);
    expect(result).toBeNull();
  });

  it("throws when deleting non-existent game", async () => {
    await expect(deleteGame(99999)).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/actions/games.test.ts`
Expected: FAIL — `deleteGame` is not exported from `@/lib/actions/games`

- [ ] **Step 3: Implement deleteGame**

Add to `src/lib/actions/games.ts`:

```typescript
export async function deleteGame(id: number) {
  return db.$transaction(async (tx) => {
    const rounds = await tx.round.findMany({
      where: { gameId: id },
      select: { id: true },
    });

    const roundIds = rounds.map((r) => r.id);

    if (roundIds.length > 0) {
      await tx.disc.deleteMany({ where: { roundId: { in: roundIds } } });
    }
    await tx.round.deleteMany({ where: { gameId: id } });
    await tx.game.delete({ where: { id } });
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/actions/games.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/actions/games.ts tests/actions/games.test.ts
git commit -m "feat: add deleteGame server action with cascade delete"
```

### Task 2: updateGameScore server action

**Files:**
- Modify: `src/lib/actions/games.ts`
- Modify: `tests/actions/games.test.ts`

- [ ] **Step 1: Write failing tests for updateGameScore**

Add these tests to `tests/actions/games.test.ts`:

```typescript
import { createGame, getGame, deleteGame, updateGameScore } from "@/lib/actions/games";

// ... existing tests ...

describe("updateGameScore", () => {
  it("updates scores and recalculates winner", async () => {
    const game = await createGame(player1Id, player2Id, player1Id);
    // Complete a round to get a finished game
    await addDisc(game.id, player1Id, 20);
    await endRound(game.id);
    await addDisc(game.id, player1Id, 20);
    await endRound(game.id);
    await addDisc(game.id, player1Id, 20);
    await endRound(game.id);
    await addDisc(game.id, player1Id, 20);
    await endRound(game.id);
    await addDisc(game.id, player1Id, 20);
    await endRound(game.id);
    // Game should now be completed with player1 winning at 100

    await updateGameScore(game.id, 50, 90);
    const updated = await getGame(game.id);
    expect(updated!.player1Score).toBe(50);
    expect(updated!.player2Score).toBe(90);
    expect(updated!.winnerId).toBe(player2Id);
  });

  it("sets winner to null on tied scores", async () => {
    const game = await createGame(player1Id, player2Id, player1Id);
    await addDisc(game.id, player1Id, 20);
    await endRound(game.id);
    await addDisc(game.id, player1Id, 20);
    await endRound(game.id);
    await addDisc(game.id, player1Id, 20);
    await endRound(game.id);
    await addDisc(game.id, player1Id, 20);
    await endRound(game.id);
    await addDisc(game.id, player1Id, 20);
    await endRound(game.id);

    await updateGameScore(game.id, 75, 75);
    const updated = await getGame(game.id);
    expect(updated!.winnerId).toBeNull();
  });

  it("rejects negative scores", async () => {
    const game = await createGame(player1Id, player2Id, player1Id);
    await expect(updateGameScore(game.id, -10, 50)).rejects.toThrow(
      "Scores cannot be negative"
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/actions/games.test.ts`
Expected: FAIL — `updateGameScore` is not exported

- [ ] **Step 3: Implement updateGameScore**

Add to `src/lib/actions/games.ts`:

```typescript
export async function updateGameScore(
  id: number,
  player1Score: number,
  player2Score: number
) {
  if (player1Score < 0 || player2Score < 0) {
    throw new Error("Scores cannot be negative");
  }

  const game = await db.game.findUnique({ where: { id } });
  if (!game) {
    throw new Error("Game not found");
  }

  let winnerId: number | null = null;
  if (player1Score > player2Score) {
    winnerId = game.player1Id;
  } else if (player2Score > player1Score) {
    winnerId = game.player2Id;
  }

  return db.game.update({
    where: { id },
    data: { player1Score, player2Score, winnerId },
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/actions/games.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/actions/games.ts tests/actions/games.test.ts
git commit -m "feat: add updateGameScore server action with winner recalc"
```

---

## Chunk 2: UI Components

### Task 3: DeleteGameDialog component

**Files:**
- Create: `src/components/delete-game-dialog.tsx`

- [ ] **Step 1: Create the delete confirmation dialog**

Create `src/components/delete-game-dialog.tsx`:

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
import { useTransition } from "react";
import { deleteGame } from "@/lib/actions/games";

interface DeleteGameDialogProps {
  open: boolean;
  onClose: () => void;
  gameId: number;
}

export function DeleteGameDialog({ open, onClose, gameId }: DeleteGameDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteGame(gameId);
      router.push("/");
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>Delete Game</DialogTitle>
          <DialogDescription>
            Delete this game? This can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-2">
          <Button
            variant="destructive"
            size="lg"
            className="w-full"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? "Deleting..." : "Delete"}
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/delete-game-dialog.tsx
git commit -m "feat: add DeleteGameDialog component"
```

### Task 4: EditScoreDialog component

**Files:**
- Create: `src/components/edit-score-dialog.tsx`

- [ ] **Step 1: Create the edit score dialog**

Create `src/components/edit-score-dialog.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateGameScore } from "@/lib/actions/games";

interface EditScoreDialogProps {
  open: boolean;
  onClose: () => void;
  gameId: number;
  player1Name: string;
  player2Name: string;
  currentPlayer1Score: number;
  currentPlayer2Score: number;
}

export function EditScoreDialog({
  open,
  onClose,
  gameId,
  player1Name,
  player2Name,
  currentPlayer1Score,
  currentPlayer2Score,
}: EditScoreDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [p1Score, setP1Score] = useState(currentPlayer1Score);
  const [p2Score, setP2Score] = useState(currentPlayer2Score);

  function handleSave() {
    startTransition(async () => {
      await updateGameScore(gameId, p1Score, p2Score);
      onClose();
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>Edit Score</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">
              {player1Name}
            </label>
            <Input
              type="number"
              min={0}
              value={p1Score}
              onChange={(e) => setP1Score(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">
              {player2Name}
            </label>
            <Input
              type="number"
              min={0}
              value={p2Score}
              onChange={(e) => setP2Score(Number(e.target.value))}
            />
          </div>
          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              className="w-full"
              onClick={handleSave}
              disabled={isPending}
              style={{
                background: "linear-gradient(135deg, var(--rail-2), var(--rail-3))",
                color: "#1a1400",
                border: "none",
              }}
            >
              {isPending ? "Saving..." : "Save"}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/edit-score-dialog.tsx
git commit -m "feat: add EditScoreDialog component"
```

### Task 5: Wire dialogs into GameDetail page

**Files:**
- Modify: `src/app/game/[id]/game-detail.tsx`

- [ ] **Step 1: Convert GameDetail to client component and add dialog buttons**

`GameDetail` is currently a server component (no `"use client"` directive). It needs to become a client component to manage dialog open/close state. Add `"use client"` at the top, add `useState` for dialog states, import the two dialog components, and add the new buttons.

The updated `src/app/game/[id]/game-detail.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteGameDialog } from "@/components/delete-game-dialog";
import { EditScoreDialog } from "@/components/edit-score-dialog";
import Link from "next/link";

interface GameDetailProps {
  game: {
    id: number;
    player1Score: number;
    player2Score: number;
    status: string;
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const isCompleted = game.status === "completed";

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
        <CardContent className="text-center">
          {game.winner && (
            <div className="text-lg font-semibold mb-2" style={{ color: "var(--lead)" }}>
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
      <div className="space-y-3">
        {game.rounds.map((round) => {
          const p1Won = round.awardedToPlayerId === game.player1.id;
          const p2Won = round.awardedToPlayerId === game.player2.id;
          const hadHammer = round.hammerPlayerId === game.player1.id
            ? game.player1.name : game.player2.name;

          return (
            <Card key={round.roundNumber}>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground w-8">R{round.roundNumber}</span>
                  <div className="flex items-center gap-4 tabular-nums">
                    <span className="font-semibold" style={p1Won ? { color: "var(--lead)" } : undefined}>
                      {round.player1RoundScore}
                    </span>
                    <span className="text-xs text-muted-foreground">vs</span>
                    <span className="font-semibold" style={p2Won ? { color: "var(--lead)" } : undefined}>
                      {round.player2RoundScore}
                    </span>
                  </div>
                  <div className="text-right text-xs text-muted-foreground w-20">
                    {round.pointsAwarded > 0 ? (
                      <span style={{ color: "var(--lead)" }}>+{round.pointsAwarded}</span>
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
      {isCompleted && (
        <div className="flex gap-3 mt-6">
          <Button
            variant="outline"
            size="lg"
            className="flex-1"
            onClick={() => setShowEditDialog(true)}
          >
            Edit Score
          </Button>
          <Button
            variant="destructive"
            size="lg"
            className="flex-1"
            onClick={() => setShowDeleteDialog(true)}
          >
            Delete Game
          </Button>
        </div>
      )}
      <div className="flex gap-3 mt-3">
        <a href={`/game/new?p1=${game.player1.id}&p2=${game.player2.id}`} className="flex-1">
          <Button
            className="w-full"
            size="lg"
            style={{
              background: "linear-gradient(135deg, var(--rail-2), var(--rail-3))",
              color: "#1a1400",
              border: "none",
            }}
          >Rematch</Button>
        </a>
        <Link href="/stats" className="flex-1">
          <Button variant="secondary" className="w-full" size="lg">Stats</Button>
        </Link>
      </div>

      {/* Dialogs */}
      <DeleteGameDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        gameId={game.id}
      />
      {isCompleted && (
        <EditScoreDialog
          open={showEditDialog}
          onClose={() => setShowEditDialog(false)}
          gameId={game.id}
          player1Name={game.player1.name}
          player2Name={game.player2.name}
          currentPlayer1Score={game.player1Score}
          currentPlayer2Score={game.player2Score}
        />
      )}
    </div>
  );
}
```

**Key changes from current file:**
- Added `"use client"` directive at top
- Added `useState` import and `status` to the `GameDetailProps` interface
- Added `showDeleteDialog` and `showEditDialog` state
- Added Edit Score + Delete Game button row above Rematch/Stats (only for completed games)
- Changed Rematch/Stats row from `mt-6` to `mt-3` since edit/delete row takes `mt-6`
- Imported and rendered both dialog components

- [ ] **Step 2: Run all tests to verify nothing broke**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/game/[id]/game-detail.tsx
git commit -m "feat: wire edit score and delete game dialogs into game detail page"
```

### Task 6: Add delete button to in-progress games

**Files:**
- Modify: `src/app/game/[id]/game-detail.tsx` (already done above — has delete for completed)
- Note: For in-progress games, the `ExitMenuDialog` already shows when users tap the exit button in `GameClient`. We need to add a delete option there too.
- Modify: `src/components/exit-menu-dialog.tsx`

- [ ] **Step 1: Add Delete Game button to ExitMenuDialog**

Update `src/components/exit-menu-dialog.tsx` to add a delete option:

```tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteGame } from "@/lib/actions/games";

interface ExitMenuDialogProps {
  open: boolean;
  onClose: () => void;
  gameId: number;
}

export function ExitMenuDialog({ open, onClose, gameId }: ExitMenuDialogProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteGame(gameId);
      router.push("/");
    });
  }

  function handleClose() {
    setConfirming(false);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>{confirming ? "Delete Game" : "Game Menu"}</DialogTitle>
        </DialogHeader>
        {confirming ? (
          <div className="flex flex-col gap-3 mt-2">
            <p className="text-sm text-muted-foreground">
              Delete this game? This can&apos;t be undone.
            </p>
            <Button
              variant="destructive"
              size="lg"
              className="w-full"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? "Deleting..." : "Delete"}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => setConfirming(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 mt-2">
            <Button
              onClick={onClose}
              size="lg"
              className="w-full"
              style={{
                background: "linear-gradient(135deg, var(--rail-2), var(--rail-3))",
                color: "#1a1400",
                border: "none",
              }}
            >
              Resume Game
            </Button>
            <a href="/">
              <Button variant="outline" size="lg" className="w-full">
                Save & Exit
              </Button>
            </a>
            <Button
              variant="destructive"
              size="lg"
              className="w-full"
              onClick={() => setConfirming(true)}
            >
              Delete Game
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

**Key changes:** Added `deleteGame` import, `confirming` state for two-step delete, and a "Delete Game" destructive button that switches to confirmation view.

- [ ] **Step 2: Run all tests**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/exit-menu-dialog.tsx
git commit -m "feat: add delete game option to in-progress game exit menu"
```

### Task 7: Final verification

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 2: Build check**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors

- [ ] **Step 3: Manual verification on dev server**

Run: `npm run dev` and verify:
1. Navigate to a completed game → see Edit Score and Delete Game buttons
2. Tap Edit Score → dialog opens with pre-filled scores → change scores → Save → scores update, winner recalculates
3. Tap Delete Game → confirmation dialog → Delete → redirects to home, game is gone
4. Navigate to an in-progress game → tap exit menu → see Delete Game option → tap → confirmation → Delete → redirects home
5. Home page lists update correctly after deletions
