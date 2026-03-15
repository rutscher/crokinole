# Score Display Redesign & Round Confirmation

## Overview

Fix the score inflation bug, replace the center bar with an opposing progress bar featuring integrated dual scores, and replace the End Round button with a swipe-to-confirm gesture.

## Bug Fix: Score Inflation

The center bar currently computes `p1Total = game.player1Score + player1RoundScore`, adding raw disc sums mid-round. But crokinole scoring is difference-based — only the delta is awarded at round end. The center bar must show only `game.player1Score` (committed score). The round score (+N) remains in each player's top-right corner.

## Center Bar Redesign

The center bar becomes a single element: an opposing progress bar with integrated scores.

**Layout (top to bottom):**
- Wood rail (2px)
- Score bar with padding (4px top/bottom, 6px sides)
- Wood rail (2px)

Total height: ~36px. No other rows, no round indicator, no buttons.

**Opposing progress bar:**
- Single bar, `height: 28px`, `border-radius: 14px`, dark background
- P1 fill (gold gradient) grows from the left, width = `min(player1Score, 100)%`
- P2 fill (steel gradient) grows from the right, width = `min(player2Score, 100)%`
- Center line at 50% mark (subtle, 1px, rgba white)
- When fills overlap at high scores (e.g., 90 vs 85), they blend visually — builds tension

**Integrated scores — shown twice, once per side:**
- Left end (rotated 180° for P1): P1 score bold, dash, P2 score muted. Text color adapts — dark on gold fill when fill is behind the text, light with text-shadow on dark background when fill is small.
- Right end (normal for P2): P2 score bold, dash, P1 score muted. Same adaptive text color.
- Each player reads their end: their score first, opponent second.

**Menu access:**
- Small dark circle (22px) with vertical dots icon sits centered on the 50% line
- Tapping opens the menu dialog (which now includes End Round and Undo Round)

## Swipe-to-Confirm Round End

Replaces the End Round button. Each player swipes right (from their own perspective) to confirm they've finished recording their board state.

**Mechanics:**
- Detect horizontal swipe gesture on each player's half (threshold: ~50px horizontal movement with minimal vertical deviation)
- P1's "swipe right" is physically a leftward swipe on the screen (their half is rotated 180°). Detect in the rotated coordinate space so it feels like "swipe right" from P1's perspective.
- P2's "swipe right" is a normal rightward swipe.

**Active state (default):**
- Board is interactive (tap to place, tap to remove discs)
- Subtle "swipe → done" hint text in the bottom-right corner of each player's half
- No undo button (tap-to-remove on the board handles disc corrections)

**Locked state (after swiping right):**
- Board dims (opacity ~0.4)
- Lock icon + "Locked In" text overlay centered on the board (subtle green color, `rgba(90,117,96,0.7)`)
- "← swipe to unlock" hint replaces the "swipe → done" hint
- Board is non-interactive (taps ignored)
- Swipe left (from player's perspective) unlocks: removes overlay, board becomes interactive again

**Both locked → round auto-ends:**
- When the second player locks in, immediately trigger `endRound` server action
- Show the round summary dialog as today
- Both boards reset for the next round

## Menu Dialog Changes

The exit menu dialog gains two options (moved from center bar):
- **End Round** — for the edge case of ending a round early by mutual agreement (before all discs placed). Shows only when the round is in progress.
- **Undo Round** — same as current, reverts last completed round. Shows only when there are completed rounds.

## Component Changes

### Modified: `CenterBar`
- Complete rewrite. New props: `player1Score`, `player2Score`, `onMenuOpen` (carried over from existing interface). Removes all other props (`roundNumber`, `player1Total`, `player2Total`, `onEndRound`, `disabled`).
- Renders the opposing progress bar with integrated dual scores and center menu dot.

### Modified: `PlayerHalf`
- Remove `onUndo` prop and undo button
- Add `isLocked` and `onToggleLock` props
- Pass `onSwipe` callback through to MiniBoard (PlayerHalf doesn't detect swipes itself — MiniBoard handles it since it owns pointer events on the SVG)
- When locked: dim board, show lock overlay, disable board interaction
- Render "swipe → done" or "← swipe to unlock" hint in bottom-right corner

### Modified: `GameClient`
- Fix score bug: pass `game.player1Score` (not `p1Total`) to CenterBar
- Add `player1Locked` and `player2Locked` state (both default `false`)
- `handleToggleLock(playerId)`: toggles locked state for that player
- When both become locked: call `endRound`, show summary, reset locked states
- Pass `isLocked` and `onToggleLock` to each PlayerHalf
- Pass `handleEndRound` to ExitMenuDialog as `onEndRound` (same function is also used by the auto-end-on-both-locked logic)
- Pass `handleUndoRound` to ExitMenuDialog (already wired from prior work)
- Use a `useEffect` watching `[player1Locked, player2Locked]` to call `handleEndRound()` (the wrapper, not the raw `endRound` action) when both are true — this ensures the round summary dialog shows. Use a ref guard (`endingRoundRef`) to prevent double-calls in strict mode.
- Reset both lock states when a round ends (whether via both-locked auto-end or manual menu End Round)

### Modified: `ExitMenuDialog`
- Add `onEndRound` prop (for manual early end round)
- Add `canEndRound` prop (boolean — true when there's an in-progress round, controls visibility of End Round button)
- Already has `onUndoRound` and `canUndoRound` from prior work

### Removed from `PlayerHalf`:
- Undo button (bottom-right corner)
- `onUndo` prop

## Swipe Detection Implementation

Swipe detection lives on the player half container. It must coexist with the MiniBoard's tap handling — the board's `onPointerDown` calls `stopPropagation`, so pointer events originating on the SVG don't bubble to the parent. To allow swipes over the board, move swipe detection into the MiniBoard component itself: if the pointer moves >50px horizontally before release, treat it as a swipe (call `onSwipe` prop) instead of a tap.

**Pointer event flow (new handlers on the SVG element — `onPointerMove` and `onPointerUp` are additions alongside the existing `onPointerDown`):**
- `onPointerDown`: record start position. Call `e.preventDefault()` (still needed to prevent browser scroll/zoom). Call `setPointerCapture(e.pointerId)` on the SVG element to ensure move/up events are captured even if the pointer leaves the SVG bounds mid-swipe. Do NOT call `stopPropagation` yet (wait to determine if this is a tap or swipe).
- `onPointerMove`: track movement. If horizontal distance > 50px and vertical distance < 30px, mark as swipe-in-progress.
- `onPointerUp`: release pointer capture first via `releasePointerCapture(e.pointerId)`. Then: if marked as swipe, call `onSwipe(direction)` prop instead of processing as a tap. If not a swipe (movement < 50px), process as normal tap (hit-test / place disc).

**Direction in screen space:**
- P1 lock (swipe right from P1's perspective) = negative deltaX in screen space (P1's half has CSS `rotate-180`)
- P1 unlock (swipe left from P1's perspective) = positive deltaX in screen space
- P2 lock = positive deltaX in screen space
- P2 unlock = negative deltaX in screen space
- The `isRotated` prop on PlayerHalf determines the sign mapping. PlayerHalf passes the appropriate direction to `onToggleLock`.

## Testing

- Existing round scoring tests remain valid
- New test: verify `endRound` is not called when only one player confirms
- Score display: verify CenterBar receives `game.player1Score` not `game.player1Score + roundScore`
- Swipe gesture: manual/visual testing
