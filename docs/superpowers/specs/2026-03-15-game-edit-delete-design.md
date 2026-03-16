# Game Edit & Delete — Design Spec

**Goal:** Add edit and delete capabilities to the existing game detail page (`/game/[id]`).

## Delete Game

### Behavior
- A "Delete Game" button (destructive style) appears on the game detail page for all games (in-progress and completed).
- Tapping opens a confirmation dialog: "Delete this game? This can't be undone."
- On confirm: a server action deletes the game and all its related data, then redirects to `/`.

### Server Action: `deleteGame(id: number)`
- Runs in a Prisma transaction (no cascade deletes in schema).
- Deletion order: Discs (via rounds) → Rounds → Game.
- Steps:
  1. Find all round IDs for the game.
  2. `disc.deleteMany({ where: { roundId: { in: roundIds } } })`
  3. `round.deleteMany({ where: { gameId: id } })`
  4. `game.delete({ where: { id } })`
- On success: redirect to `/`.

### UI
- Uses the existing `Dialog` component pattern (same as `round-summary-dialog.tsx`, `game-over-dialog.tsx`).
- Dialog contains: warning text + "Cancel" button + "Delete" button (destructive).
- Button placement: bottom of game detail page alongside existing action buttons.

## Edit Game Score

### Behavior
- An "Edit Score" button (secondary style) appears on the game detail page **only for completed games** (in-progress games are actively being played).
- Tapping opens a dialog with:
  - Two number inputs, labeled with player names, pre-filled with current scores.
  - "Cancel" and "Save" buttons.
- On save: a server action updates scores and auto-recalculates the winner.

### Server Action: `updateGameScore(id: number, player1Score: number, player2Score: number)`
- Validates: scores must be non-negative integers.
- Calculates winner: higher score wins. If tied, `winnerId = null`.
- Updates: `player1Score`, `player2Score`, `winnerId` on the Game record.
- Does NOT modify rounds or discs (this is a top-level score correction, not a replay edit).

### UI
- Uses the existing `Dialog` component.
- Dialog contains: two `Input` fields (type="number") + player name labels + "Cancel" + "Save".
- Button placement: bottom of game detail page alongside existing action buttons.

## UI Layout (Game Detail Page Bottom)

Current buttons: Rematch | Stats

New layout:
```
[ Edit Score ]  [ Delete Game ]
[    Rematch   ] [    Stats    ]
```

- Edit Score: `variant="outline"`, only visible for completed games.
- Delete Game: `variant="destructive"`.
- Rematch and Stats: unchanged.

## What's NOT in Scope

- No round-by-round editing.
- No new pages or routes.
- No swipe gestures or inline editing on home page.
- No bulk delete operations.
- No edit for in-progress games (they use the existing game flow).

## Files to Create or Modify

- **Create:** `src/components/delete-game-dialog.tsx` — confirmation dialog + delete action trigger
- **Create:** `src/components/edit-score-dialog.tsx` — score editing dialog + save action trigger
- **Modify:** `src/lib/actions/games.ts` — add `deleteGame` and `updateGameScore` server actions
- **Modify:** `src/app/game/[id]/game-detail.tsx` — add Edit Score and Delete Game buttons, import dialogs
- **Test:** `tests/actions/games.test.ts` — add tests for delete and edit actions
