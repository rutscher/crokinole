# Score Display Redesign & Round Confirmation — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the score inflation bug, replace the center bar with an opposing progress bar, and add swipe-to-confirm round ending.

**Architecture:** CenterBar becomes a pure progress bar with integrated scores. MiniBoard gains swipe detection (pointer lifecycle) alongside existing tap handling. PlayerHalf adds lock overlay and passes swipe through. GameClient manages lock state with useEffect-based auto-end.

**Tech Stack:** Next.js 16.1 (App Router), React 19.2, CSS transitions for lock overlay.

**Spec:** `docs/superpowers/specs/2026-03-15-score-display-redesign.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/components/center-bar.tsx` | Opposing progress bar with integrated dual scores + center menu dot |
| Modify | `src/components/mini-board.tsx` | Add swipe detection (pointerMove/pointerUp) alongside existing tap handling |
| Modify | `src/components/player-half.tsx` | Remove undo button, add lock overlay, pass swipe/lock props |
| Modify | `src/components/exit-menu-dialog.tsx` | Add End Round button with canEndRound guard |
| Modify | `src/app/game/[id]/game-client.tsx` | Fix score bug, add lock state, useEffect auto-end, rewire props |

---

## Chunk 1: CenterBar + ExitMenuDialog

### Task 1: Rewrite CenterBar as opposing progress bar

**Files:**
- Modify: `src/components/center-bar.tsx`

- [ ] **Step 1: Replace CenterBar with opposing progress bar**

Replace the entire content of `src/components/center-bar.tsx`:

```typescript
"use client";

interface CenterBarProps {
  player1Score: number;
  player2Score: number;
  onMenuOpen: () => void;
}

export function CenterBar({
  player1Score,
  player2Score,
  onMenuOpen,
}: CenterBarProps) {
  const p1Width = Math.min(player1Score, 100);
  const p2Width = Math.min(player2Score, 100);

  // Adaptive text: use dark text when score >= 15 (enough fill behind), light otherwise
  const p1TextColor = player1Score >= 15 ? "#1a1400" : "#ddd8d0";
  const p1MutedColor = player1Score >= 15 ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)";
  const p1DashColor = player1Score >= 15 ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.3)";

  // P2 fill is steel (dark) — light text always works
  const p2TextColor = "#ddd8d0";
  const p2MutedColor = "rgba(255,255,255,0.5)";
  const p2DashColor = "rgba(255,255,255,0.3)";

  return (
    <div style={{ padding: "4px 6px", background: "var(--surface-deep)" }}>
      <div
        style={{
          position: "relative",
          height: 28,
          background: "rgba(255,255,255,0.04)",
          borderRadius: 14,
          overflow: "visible",
        }}
      >
        {/* P1 fill (gold, from left) */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: `${p1Width}%`,
            background: "linear-gradient(90deg, #c8a862, rgba(200,168,98,0.4))",
            borderRadius: "14px 0 0 14px",
            transition: "width 0.3s ease",
          }}
        />

        {/* P2 fill (steel, from right) */}
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: `${p2Width}%`,
            background: "linear-gradient(270deg, #6a7580, rgba(106,117,128,0.4))",
            borderRadius: "0 14px 14px 0",
            transition: "width 0.3s ease",
          }}
        />

        {/* P1 scores (rotated 180° for P1) */}
        <div
          style={{
            position: "absolute",
            left: 6,
            top: "50%",
            transform: "translateY(-50%) rotate(180deg)",
            display: "flex",
            alignItems: "center",
            gap: 2,
            zIndex: 2,
          }}
        >
          <span style={{ fontSize: 11, fontWeight: "bold", color: p1TextColor, textShadow: player1Score < 15 ? "0 1px 3px rgba(0,0,0,0.8)" : "none" }}>
            {player1Score}
          </span>
          <span style={{ fontSize: 8, color: p1DashColor }}>-</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: p1MutedColor, textShadow: player1Score < 15 ? "0 1px 3px rgba(0,0,0,0.8)" : "none" }}>
            {player2Score}
          </span>
        </div>

        {/* Menu dot (center) */}
        <button
          onClick={onMenuOpen}
          aria-label="Game menu"
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 3,
            width: 22,
            height: 22,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            background: "rgba(18,16,14,0.85)",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="#8a8078">
            <circle cx="12" cy="5" r="2.5" />
            <circle cx="12" cy="12" r="2.5" />
            <circle cx="12" cy="19" r="2.5" />
          </svg>
        </button>

        {/* P2 scores (normal for P2) */}
        <div
          style={{
            position: "absolute",
            right: 6,
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            alignItems: "center",
            gap: 2,
            zIndex: 2,
          }}
        >
          <span style={{ fontSize: 11, fontWeight: "bold", color: p2TextColor, textShadow: player2Score < 15 ? "0 1px 3px rgba(0,0,0,0.8)" : "none" }}>
            {player2Score}
          </span>
          <span style={{ fontSize: 8, color: p2DashColor }}>-</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: p2MutedColor, textShadow: player2Score < 15 ? "0 1px 3px rgba(0,0,0,0.8)" : "none" }}>
            {player1Score}
          </span>
        </div>

        {/* Center line */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 3,
            bottom: 3,
            width: 1,
            background: "rgba(255,255,255,0.12)",
          }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/center-bar.tsx
git commit -m "feat: rewrite CenterBar as opposing progress bar with integrated scores"
```

---

### Task 2: Add End Round to ExitMenuDialog

**Files:**
- Modify: `src/components/exit-menu-dialog.tsx`

- [ ] **Step 1: Add onEndRound and canEndRound props**

In `src/components/exit-menu-dialog.tsx`, update the interface (find `interface ExitMenuDialogProps`):

```typescript
interface ExitMenuDialogProps {
  open: boolean;
  onClose: () => void;
  gameId: number;
  onUndoRound?: () => void;
  canUndoRound?: boolean;
  onEndRound?: () => void;
  canEndRound?: boolean;
}
```

Update the function signature (find `export function ExitMenuDialog`):

```typescript
export function ExitMenuDialog({
  open,
  onClose,
  gameId,
  onUndoRound,
  canUndoRound = false,
  onEndRound,
  canEndRound = false,
}: ExitMenuDialogProps) {
```

Add End Round button after the Undo Last Round button block and before the `<Link href="/">` (find the closing `)}` of the canUndoRound block, add after it):

```tsx
{canEndRound && onEndRound && (
  <Button
    variant="outline"
    size="lg"
    className="w-full"
    onClick={() => {
      onEndRound();
      onClose();
    }}
  >
    End Round
  </Button>
)}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/exit-menu-dialog.tsx
git commit -m "feat: add End Round option to ExitMenuDialog"
```

---

## Chunk 2: MiniBoard swipe detection + PlayerHalf lock overlay

### Task 3: Add swipe detection to MiniBoard

**Files:**
- Modify: `src/components/mini-board.tsx`

- [ ] **Step 1: Add onSwipe prop and swipe state refs**

In `src/components/mini-board.tsx`, add `onSwipe` to the props interface (find `interface MiniBoardProps`):

```typescript
interface MiniBoardProps {
  discs: DiscData[];
  playerId: number;
  opponentDiscs: DiscData[];
  onPlace: (ringValue: number, posX: number, posY: number) => void;
  onRemove: (discId: number) => void;
  onSwipe?: (direction: "left" | "right") => void;
  disabled?: boolean;
  maxDiscs?: number;
  isPlayer1?: boolean;
}
```

Update the destructuring (find the function signature) to include `onSwipe`:

```typescript
export function MiniBoard({
  discs,
  playerId,
  opponentDiscs,
  onPlace,
  onRemove,
  onSwipe,
  disabled = false,
  maxDiscs = 8,
  isPlayer1 = false,
}: MiniBoardProps) {
```

Add swipe tracking refs after the existing refs (find `const prevOwnCountRef = useRef(0);`), add after it:

```typescript
const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
const isSwipingRef = useRef(false);
```

- [ ] **Step 2: Replace handlePointerDown with full pointer lifecycle**

Replace the entire `handlePointerDown` callback (find `const handlePointerDown = useCallback(` through its closing `);`) with three handlers:

```typescript
const handlePointerDown = useCallback(
  (e: React.PointerEvent<SVGSVGElement>) => {
    if (disabled) return;
    e.preventDefault();

    const svg = svgRef.current;
    if (!svg) return;

    svg.setPointerCapture(e.pointerId);
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    isSwipingRef.current = false;
  },
  [disabled],
);

const handlePointerMove = useCallback(
  (e: React.PointerEvent<SVGSVGElement>) => {
    if (!pointerStartRef.current) return;
    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;
    if (Math.abs(dx) > 50 && Math.abs(dy) < 30) {
      isSwipingRef.current = true;
    }
  },
  [],
);

const handlePointerUp = useCallback(
  (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (svg) svg.releasePointerCapture(e.pointerId);

    const start = pointerStartRef.current;
    pointerStartRef.current = null;

    if (!start) return;

    if (isSwipingRef.current) {
      // It was a swipe
      isSwipingRef.current = false;
      const dx = e.clientX - start.x;
      if (onSwipe) {
        onSwipe(dx > 0 ? "right" : "left");
      }
      return;
    }

    // It was a tap — process as disc placement/removal
    if (disabled) return;
    const svg2 = svgRef.current;
    if (!svg2) return;

    const pt = svg2.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPt = pt.matrixTransform(svg2.getScreenCTM()!.inverse());
    const posX = svgPt.x;
    const posY = svgPt.y;

    // Skip hit-testing in the 20 zone
    const tapRadius = Math.sqrt(posX * posX + posY * posY);
    const inHoleZone = tapRadius < 0.08;

    const hitDisc = !inHoleZone ? findDiscAtPosition(discs, posX, posY, playerId) : null;
    if (hitDisc) {
      setFlashingDiscId(hitDisc.id);
      setFlashValue(hitDisc.ringValue);
      setTimeout(() => {
        onRemove(hitDisc.id);
        setFlashingDiscId(null);
        setFlashValue(null);
      }, 300);
      return;
    }

    if (atLimit) return;
    const ringValue = getRingValue(posX, posY);
    if (ringValue == null) return;

    onPlace(ringValue, posX, posY);
  },
  [disabled, discs, playerId, onPlace, onRemove, onSwipe, atLimit],
);
```

- [ ] **Step 3: Update SVG event handlers**

Replace the SVG element's event handler (find `onPointerDown={handlePointerDown}`):

Change it to:

```tsx
onPointerDown={handlePointerDown}
onPointerMove={handlePointerMove}
onPointerUp={handlePointerUp}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/mini-board.tsx
git commit -m "feat: add swipe detection to MiniBoard alongside tap handling"
```

---

### Task 4: Add lock overlay and swipe props to PlayerHalf

**Files:**
- Modify: `src/components/player-half.tsx`

- [ ] **Step 1: Update PlayerHalf props and remove undo**

In `src/components/player-half.tsx`, replace the interface (find `interface PlayerHalfProps`):

```typescript
interface PlayerHalfProps {
  name: string;
  roundScore: number;
  discCount: number;
  hasHammer: boolean;
  isRotated: boolean;
  playerId: number;
  discs: DiscData[];
  opponentDiscs: DiscData[];
  isPlayer1: boolean;
  onPlace: (ringValue: number, posX: number, posY: number) => void;
  onRemove: (discId: number) => void;
  onSwipe: (direction: "left" | "right") => void;
  isLocked: boolean;
  disabled?: boolean;
}
```

Update the function destructuring (find `export function PlayerHalf`):

```typescript
export function PlayerHalf({
  name,
  roundScore,
  discCount,
  hasHammer,
  isRotated,
  playerId,
  discs,
  opponentDiscs,
  isPlayer1,
  onPlace,
  onRemove,
  onSwipe,
  isLocked,
  disabled,
}: PlayerHalfProps) {
```

- [ ] **Step 2: Pass onSwipe to MiniBoard and add lock overlay**

Replace the MiniBoard section and everything after it (find `{/* Center: MiniBoard */}` through the end of the component's return JSX, before the final `</div>` and `);`):

```tsx
      {/* Center: MiniBoard */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden p-1">
        <MiniBoard
          discs={discs}
          playerId={playerId}
          opponentDiscs={opponentDiscs}
          onPlace={onPlace}
          onRemove={onRemove}
          onSwipe={onSwipe}
          disabled={isLocked || disabled}
          maxDiscs={8}
          isPlayer1={isPlayer1}
        />
      </div>

      {/* Lock overlay */}
      {isLocked && (
        <div
          className="absolute inset-0 flex items-center justify-center z-20"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div className="flex flex-col items-center gap-1">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(90,117,96,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span style={{ fontSize: 9, color: "rgba(90,117,96,0.7)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>
              Locked In
            </span>
          </div>
        </div>
      )}

      {/* Bottom-left: 20s tray */}
      <div className="absolute bottom-2 left-3 z-10">
        <TwentiesTray
          discs={twenties}
          onAdd={() => onPlace(20, 0, 0)}
          onRemove={onRemove}
          disabled={isLocked || disabled}
          isPlayer1={isPlayer1}
        />
      </div>

      {/* Bottom-right: Swipe hint */}
      <div className="absolute bottom-2 right-3 z-10">
        <span style={{ fontSize: 7, color: isLocked ? "#5a7560" : "#5a524a" }}>
          {isLocked ? "← swipe to unlock" : "swipe → done"}
        </span>
      </div>
```

Remove the old `Button` import since undo button is gone. Update the import line (find `import { Button } from "@/components/ui/button";`) — remove it entirely.

- [ ] **Step 3: Commit**

```bash
git add src/components/player-half.tsx
git commit -m "feat: add lock overlay and swipe hints to PlayerHalf, remove undo button"
```

---

## Chunk 3: GameClient wiring

### Task 5: Rewire GameClient for new score display and lock state

**Files:**
- Modify: `src/app/game/[id]/game-client.tsx`

- [ ] **Step 1: Add lock state and endingRound ref**

In `src/app/game/[id]/game-client.tsx`, add after the existing state declarations (find `const nextLocalId = useRef(-1);`, add after it):

```typescript
const [player1Locked, setPlayer1Locked] = useState(false);
const [player2Locked, setPlayer2Locked] = useState(false);
const endingRoundRef = useRef(false);
```

- [ ] **Step 2: Add handleToggleLock and auto-end useEffect**

Add after the `handleRemoveDisc` callback (find the closing of `handleRemoveDisc`, add after it):

```typescript
const handleSwipe = useCallback(
  (playerId: number, isRotated: boolean, direction: "left" | "right") => {
    // In screen space: P1 (rotated) "swipe right" = negative deltaX = "left" in screen
    // P2 (normal) "swipe right" = positive deltaX = "right" in screen
    const isLockSwipe = isRotated ? direction === "left" : direction === "right";
    const isUnlockSwipe = isRotated ? direction === "right" : direction === "left";

    if (playerId === game.player1Id) {
      if (isLockSwipe) setPlayer1Locked(true);
      if (isUnlockSwipe) setPlayer1Locked(false);
    } else {
      if (isLockSwipe) setPlayer2Locked(true);
      if (isUnlockSwipe) setPlayer2Locked(false);
    }
  },
  [game.player1Id],
);

// Auto-end round when both players lock in
// eslint-disable-next-line react-hooks/exhaustive-deps -- handleEndRound is a plain function, intentionally excluded
useEffect(() => {
  if (player1Locked && player2Locked && !endingRoundRef.current) {
    endingRoundRef.current = true;
    handleEndRound();
    setPlayer1Locked(false);
    setPlayer2Locked(false);
    endingRoundRef.current = false;
  }
}, [player1Locked, player2Locked]);
```

- [ ] **Step 3: Remove p1Total/p2Total and handleUndo**

Remove these lines (find `const p1Total = game.player1Score + player1RoundScore;` and the line below it):

```typescript
// DELETE these two lines:
const p1Total = game.player1Score + player1RoundScore;
const p2Total = game.player2Score + player2RoundScore;
```

Remove the `handleUndo` callback entirely (find `const handleUndo = useCallback` through its closing `}, [game.id, router]);`).

Also update the import to remove `undoDisc` (find the import from `@/lib/actions/rounds`):

```typescript
import { addDisc, removeDisc, endRound, undoRound } from "@/lib/actions/rounds";
```

- [ ] **Step 4: Update CenterBar props in JSX**

Replace the CenterBar JSX block (find `<CenterBar`):

```tsx
<CenterBar
  player1Score={game.player1Score}
  player2Score={game.player2Score}
  onMenuOpen={() => setShowExitMenu(true)}
/>
```

- [ ] **Step 5: Update PlayerHalf props in JSX**

Replace the Player 1 `<PlayerHalf` JSX block (find the first `<PlayerHalf`):

```tsx
<PlayerHalf
  name={game.player1.name}
  roundScore={player1RoundScore}
  discCount={player1DiscCount}
  hasHammer={currentRound?.hammerPlayerId === game.player1Id}
  isRotated={true}
  playerId={game.player1Id}
  discs={localDiscs}
  opponentDiscs={player2Discs}
  isPlayer1={true}
  onPlace={(rv, px, py) => handleDiscTap(game.player1Id, rv, px, py)}
  onRemove={(id) => handleRemoveDisc(id)}
  onSwipe={(dir) => handleSwipe(game.player1Id, true, dir)}
  isLocked={player1Locked}
  disabled={isGameOver || isPending}
/>
```

Replace the Player 2 `<PlayerHalf` JSX block (find the second `<PlayerHalf`):

```tsx
<PlayerHalf
  name={game.player2.name}
  roundScore={player2RoundScore}
  discCount={player2DiscCount}
  hasHammer={currentRound?.hammerPlayerId === game.player2Id}
  isRotated={false}
  playerId={game.player2Id}
  discs={localDiscs}
  opponentDiscs={player1Discs}
  isPlayer1={false}
  onPlace={(rv, px, py) => handleDiscTap(game.player2Id, rv, px, py)}
  onRemove={(id) => handleRemoveDisc(id)}
  onSwipe={(dir) => handleSwipe(game.player2Id, false, dir)}
  isLocked={player2Locked}
  disabled={isGameOver || isPending}
/>
```

- [ ] **Step 6: Update ExitMenuDialog props**

Replace the `<ExitMenuDialog` JSX block (find `<ExitMenuDialog`):

```tsx
<ExitMenuDialog
  open={showExitMenu}
  onClose={() => setShowExitMenu(false)}
  gameId={game.id}
  onUndoRound={handleUndoRound}
  canUndoRound={completedRoundCount > 0}
  onEndRound={handleEndRound}
  canEndRound={!!currentRound}
/>
```

- [ ] **Step 7: Reset lock states on round dismiss**

Update `handleDismissRoundResult` (find `function handleDismissRoundResult()`) to also reset locks:

```typescript
function handleDismissRoundResult() {
  setRoundResult(null);
  setPlayer1Locked(false);
  setPlayer2Locked(false);
  router.refresh();
}
```

- [ ] **Step 8: Commit**

```bash
git add src/app/game/[id]/game-client.tsx
git commit -m "feat: wire lock state, auto-end on both confirmed, fix score inflation"
```

---

### Task 6: Build and verify

- [ ] **Step 1: Run all tests**

```bash
npm test
```

Expected: All 51 tests pass (no server-side changes).

- [ ] **Step 2: Run production build**

```bash
npm run build
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 3: Manual smoke test**

```bash
npm run dev
```

Open http://localhost:3000. Create a new game. Verify:
- Center bar shows opposing progress bar with dual scores (0-0 at start)
- Scores show committed game score only (not inflated mid-round)
- Menu dot in center of progress bar opens menu
- Menu has End Round and Undo Last Round options
- Placing discs updates round score (+N) in corners but NOT the progress bar
- Swipe right on P2's half → board dims, lock overlay shows, "← swipe to unlock" hint
- Swipe left to unlock → board interactive again
- Both players swipe right → round auto-ends, summary dialog shows
- After dismissing summary, progress bar updates with new committed scores
- No undo button (tap-to-remove works for corrections)
