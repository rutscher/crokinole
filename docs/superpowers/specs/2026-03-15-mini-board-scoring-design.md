# Mini Crokinole Board Scoring UI

## Overview

Replace the current row of ring buttons (5/10/15/20) on the game scoring screen with interactive mini crokinole boards. Each player taps their board where their discs actually landed, and the opponent's discs appear on their board in real time for verification. The score is derived automatically from disc positions.

## Rules & Constraints

- 8 discs per player per round
- Difference-based scoring: higher scorer gets `abs(p1 - p2)` added to their total
- First to 100 wins
- Hammer alternates each round
- Disc on a ring boundary line scores the lower ring value

## Player Half Layout

Each player's half of the screen contains a maximized circular board with info tucked into the four corners (dead space around the circle):

| Corner | Content |
|--------|---------|
| Top-left | Player name + hammer indicator (large) |
| Top-right | Round score (+N) and disc count (X of 8) |
| Bottom-left | 20s tray — horizontal row of discs that went in the hole |
| Bottom-right | Undo button |

Player 1's half is rotated 180 degrees (same as current behavior).

## Mini Board

- 4 concentric tappable rings: 5 (outermost), 10, 15, 20 (center hole)
- Ring widths exaggerated for tap comfort — equal-width rings (each ring occupies 25% of the radius)
- Clear, distinct boundary lines between rings so line-vs-ring placement is unambiguous
- Subtle ring value labels on the board for reference
- Board diameter maximized within the player half (~220px on iPhone-class screens)
- Ring boundary thresholds (normalized radius 0-1): 0–0.25 = 20 (hole), 0.25–0.50 = 15, 0.50–0.75 = 10, 0.75–1.0 = 5. Taps outside radius 1.0 are ignored.

## Disc Placement

- Player taps anywhere on the board — disc renders exactly where tapped
- Ring value is derived from tap distance to center (mapping to 5/10/15/20 zones)
- On placement, the ring value flashes on the disc face for ~1.5 seconds, then fades to a clean disc — immediate confirmation without permanent clutter
- 8-disc limit per player enforced in UI (disable taps when at 8)
- Optimistic updates: disc appears instantly, server action fires async, revert on failure (same pattern as current implementation)

## 20s (Hole Shots)

- Tapping the center hole places a 20
- Disc briefly appears in center, then animates to the 20s tray (~300ms transition)
- The 20s tray has a "+" tap target at the end of the row for adding 20s directly (separate from existing disc tap targets which remove)
- Tray shows discs laid out horizontally; tapping an existing disc in the tray removes it

## Disc Colors & Appearance

- Traditional crokinole two-tone: one player gets light discs, one gets dark discs
- Colors are consistent across both boards (Player 1 always light, Player 2 always dark, or assigned at game creation)
- Both players' discs rendered at equal visual prominence — no ghosting or muting

## Opponent Disc Mirroring

Both players share the same phone screen (single-device app). Both halves render from the same `localDiscs` state array, so when Player A places a disc, Player B's half updates instantly — no network sync needed.

- Opponent discs are rendered on your board by filtering `localDiscs` for the other player's ID
- Position is rotated 180 degrees to match the opponent's perspective (negate posX and posY)
- Opponent discs use the opponent's color, clearly distinguishable from your own
- Verification value: both players see the same board state from their own side of the table

## Disc Removal

Two mechanisms:
1. **Tap-to-remove:** Tap an existing disc on the board to remove it (value flashes briefly before removal for confirmation). Hit-testing: if the tap lands within 0.08 normalized radius of an existing own disc center, treat it as a removal (closest disc wins if multiple are within range). If not near any own disc, treat it as a new placement. Own discs only — you cannot remove opponent discs. For 20s, tap a disc in the tray to remove it.
2. **Undo button:** Removes the last-placed disc regardless of which ring it was on (bottom-right corner).

## Center Bar

Single row, ~40px tall:

```
[menu ⋮] [P1 score]  [R3] [End Round]  [P2 score]
```

- **Left edge:** Menu icon (vertical dots) — opens exit menu dialog (which now also contains Undo Round)
- **Left of center:** Player 1 total score
- **Center:** Round badge (R3) next to End Round button
- **Right of center:** Player 2 total score
- Wood rail separators above and below (thin, ~3px each)

**Moved to menu:** Undo Round button (previously in center bar) moves into the exit menu dialog.

## Data Model Changes

Add two nullable Float columns to the `Disc` table:

```prisma
model Disc {
  id        Int      @id @default(autoincrement())
  roundId   Int
  playerId  Int
  ringValue Int
  posX      Float?   // x position relative to board center, normalized (-1 to 1)
  posY      Float?   // y position relative to board center, normalized (-1 to 1)
  createdAt DateTime @default(now())

  round  Round  @relation(fields: [roundId], references: [id])
  player Player @relation(fields: [playerId], references: [id])
}
```

- `posX`, `posY`: normalized coordinates relative to board center. -1 to 1 range so they're screen-size independent.
- Nullable so existing discs from old games still work.
- `ringValue` is still derived from distance (`sqrt(posX² + posY²)`) at tap time and stored explicitly — the position is for rendering only.

## Server Action Changes

### `addDisc`

Add optional `posX` and `posY` parameters:

```typescript
export async function addDisc(
  gameId: number,
  playerId: number,
  ringValue: number,
  posX?: number,
  posY?: number
)
```

Ring value is still passed explicitly (derived on the client from tap position). Position is stored alongside for rendering on the opponent's board.

### New: `removeDisc`

Tap-to-remove needs to delete a specific disc by ID (unlike `undoDisc` which removes the most recent):

```typescript
export async function removeDisc(gameId: number, discId: number)
```

Validates that the disc belongs to an in-progress round of the given game, then deletes it.

### Other actions

`undoDisc` (used by undo button — removes most recent for a player), `endRound`, `undoRound` — unchanged.

## Optimistic Update Flow

The local `Disc` interface in `game-client.tsx` gains optional `posX` and `posY` fields to carry position through the optimistic pipeline.

**Placement (addDisc):**
1. Player taps board → disc appears instantly at tap position with temp negative ID
2. `addDisc` server action fires async with ringValue + posX/posY
3. On success: server disc replaces temp disc
4. On failure: temp disc reverted
5. Opponent's half updates instantly from shared `localDiscs` state (single-device, no network sync needed)

**Tap-to-remove (removeDisc):**
1. Player taps an existing own disc → disc removed from `localDiscs` optimistically
2. If disc has a temp negative ID (not yet persisted): skip server call, just remove locally
3. If disc has a real positive ID: fire `removeDisc(gameId, discId)` async
4. On failure: restore the disc to `localDiscs`

**Undo button (undoDisc):** Same as current — removes last disc for that player from `localDiscs`, fires `undoDisc` async, reverts on failure.

## Wiring in `GameClient`

`GameClient` orchestrates the prop routing between components:
- `handleUndoRound` and `canUndoRound` move from `CenterBar` props to `ExitMenuDialog` props
- `handleDiscTap` changes signature to accept `(playerId, ringValue, posX, posY)` and passes position to `addDisc`
- New `handleRemoveDisc(discId)` callback for tap-to-remove, passed to `PlayerHalf`/`MiniBoard`
- Each `PlayerHalf` receives both its own discs and the opponent's discs filtered from `localDiscs`

## Component Changes

### New: `MiniBoard` component
- Renders the concentric ring board as SVG (viewBox-based for clean coordinate math and hit-testing)
- Handles tap events: converts screen coordinates to normalized board coordinates, derives ring value from distance
- Hit-tests against existing own discs first (tap-to-remove), falls through to placement if no disc is near the tap
- Renders both own and opponent discs at their stored positions (opponent positions negated for 180° rotation)
- Manages the value-flash animation on placement (~1.5s fade)
- Props: `discs`, `playerId`, `opponentDiscs`, `onPlace(ringValue, posX, posY)`, `onRemove(discId)`, `disabled`

### Modified: `PlayerHalf`
- Replace `RingButton` row with `MiniBoard`
- Add 20s tray rendering (bottom-left corner)
- Rearrange corner info (name/hammer top-left, score top-right, undo bottom-right)
- Layout: use `position: relative` container with absolute-positioned corner elements and centered board. The board is a circle so corners have natural dead space.
- Accept opponent's disc data for mirroring

### Modified: `CenterBar`
- Remove `onUndoRound` and `canUndoRound` props (moved to ExitMenuDialog)
- Remove Undo Round button
- Remove score comparison text (leader +N)
- Add `onMenuOpen` prop (kept) — triggers menu icon (left edge)
- Slim down to single row layout

### Modified: `ExitMenuDialog`
- Add Undo Round option — new props: `onUndoRound`, `canUndoRound`

### Removed: `RingButton`
- No longer needed; replaced by board tap interaction

## Testing

- Existing round scoring tests remain valid (data model is additive)
- New tests needed for:
  - `addDisc` with posX/posY parameters
  - `removeDisc` by specific disc ID (validates ownership and active round)
  - Ring value derivation from normalized coordinates (unit test for the mapping function)
  - 8-disc limit enforcement
- UI interaction testing (tap placement, removal, mirroring) is manual/visual

## Backward Compatibility

Old games with `posX`/`posY` as null: the game detail page (`GameDetail` component for completed games) is unaffected — it shows final scores, not board state. The `MiniBoard` only renders during in-progress games where all new discs will have positions. No fallback to old `RingButton` UI is needed.
