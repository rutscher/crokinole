# Board-Inspired UI Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the crokinole scorekeeper with warm espresso surfaces, birch wood rail framing on the game view, earth tone ring buttons, and disc-shaped status indicators.

**Architecture:** Remap shadcn CSS variables to warm brown/espresso palette in globals.css. Add a WoodRail component for the game view frame. Replace ring button flat colors with dimensional radial gradients. Replace text-based HAMMER/LEAD badges with SVG disc badges. Extend warm palette to all pages.

**Tech Stack:** Next.js (App Router), Tailwind CSS 4, shadcn/ui (Base UI), CSS custom properties

**Spec:** `docs/superpowers/specs/2026-03-14-ux-overhaul-design.md`

---

## Chunk 1: Foundation — Color Palette & CSS Variables

### Task 1: Remap shadcn dark theme CSS variables to warm palette

**Files:**
- Modify: `src/app/globals.css`

This task replaces the neutral gray shadcn dark theme variables with the warm espresso palette. Since all components consume these variables, this single change cascades through the entire app.

- [ ] **Step 1: Update the `.dark` block in globals.css**

Replace the color values within the `.dark { ... }` block. Keep the existing chart and sidebar variables unchanged — only update the core theme variables:

```css
.dark {
  --background: #1f1b17;
  --foreground: #e8e0d6;
  --card: #2a2520;
  --card-foreground: #e8e0d6;
  --popover: #2a2520;
  --popover-foreground: #e8e0d6;
  --primary: #e8e0d6;
  --primary-foreground: #1a1400;
  --secondary: #2a2520;
  --secondary-foreground: #e8e0d6;
  --muted: #2a2520;
  --muted-foreground: #8a8078;
  --accent: #2a2520;
  --accent-foreground: #e8e0d6;
  --destructive: #8e5548;
  --border: #3d362e;
  --input: #3d362e;
  --ring: #6b5f53;
  /* Keep existing --chart-1 through --chart-5 values unchanged */
  /* Keep existing --sidebar-* values unchanged */
}
```

- [ ] **Step 2: Add crokinole-specific custom properties**

Add a new `:root` block (or extend the existing one) below the `.dark` block with design tokens that don't map to shadcn variables. These are placed in `:root` (not `.dark`) because the app enforces dark mode exclusively — these values are dark-mode-only by design:

```css
/* Crokinole design tokens (dark-mode-only app, safe in :root) */
/* --text-primary maps to --foreground (#e8e0d6) */
:root {
  --surface-deep: #1a1610;
  --text-secondary: #b8a898;
  --text-dim: #6b5f53;
  --lead: #7a9e80;
  --lead-bg: rgba(90,117,96,0.15);
  --crk-border-subtle: rgba(180,170,155,0.15);
  --rail-1: #b59768;
  --rail-2: #cbb48a;
  --rail-3: #a8905c;
  --rail-4: #c4a87a;
  --ring-5-center: #5a7560;
  --ring-5-mid: #486050;
  --ring-5-edge: #3a5040;
  --ring-10-center: #6a7580;
  --ring-10-mid: #556570;
  --ring-10-edge: #485860;
  --ring-15-center: #8e5548;
  --ring-15-mid: #7a4438;
  --ring-15-edge: #663830;
  --ring-20-center: #c8a862;
  --ring-20-mid: #b09050;
  --ring-20-edge: #958040;
}
```

- [ ] **Step 3: Remove the old ring color variables**

Delete the second `:root` block at the bottom of globals.css that defines `--ring-20`, `--ring-15`, `--ring-10`, `--ring-5` (the old saturated colors). These are replaced by the gradient tokens above.

- [ ] **Step 4: Verify the app loads without errors**

Run: `npm run dev`

Open the app in a browser. All pages should now show warm espresso backgrounds and brown-toned borders instead of neutral grays. Text should be readable. No broken styles.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: remap dark theme to warm espresso palette with crokinole tokens"
```

---

## Chunk 2: Game View — Wood Rail & Surface

### Task 2: Create the WoodRail component

**Files:**
- Create: `src/components/wood-rail.tsx`

A simple presentational component that renders a horizontal birch gradient bar.

- [ ] **Step 1: Create the component**

```tsx
interface WoodRailProps {
  height?: number;
}

export function WoodRail({ height = 7 }: WoodRailProps) {
  return (
    <div
      className="w-full relative shrink-0"
      style={{
        height: `${height}px`,
        background: "linear-gradient(90deg, var(--rail-1), var(--rail-2), var(--rail-3), var(--rail-4), var(--rail-1))",
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.1), transparent)",
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/wood-rail.tsx
git commit -m "feat: add WoodRail component for birch gradient bars"
```

### Task 3: Add wood rail frame and warm surface to game view

**Files:**
- Modify: `src/app/game/[id]/game-client.tsx`

- [ ] **Step 1: Import WoodRail**

Add at the top of the imports:
```tsx
import { WoodRail } from "@/components/wood-rail";
```

- [ ] **Step 2: Replace the outer container and player background gradients**

Replace the current return JSX. Key changes:
- Remove the blue/red gradient `bg-gradient-*` classes from both player `div` wrappers
- Add `WoodRail` at the top, before center bar (both sides), and at the bottom
- Add vignette overlay and inner shadow to each player half
- Set the surface color on both player halves

Current outer div:
```tsx
<div className="h-dvh flex flex-col bg-background overflow-hidden select-none"
```
Keep this — `bg-background` now resolves to `#1f1b17` from Task 1.

Replace Player 1 wrapper (lines 200-204):
```tsx
{/* Player 1 (top, rotated 180deg) */}
<WoodRail height={7} />
<div className="flex-1 flex relative overflow-hidden">
  {/* Inner shadow from rail */}
  <div className="absolute top-0 left-0 right-0 h-3 z-10"
    style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.3), transparent)" }} />
  {/* Vignette */}
  <div className="absolute inset-0"
    style={{ background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.15) 100%)" }} />
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
```

Wrap the CenterBar with 1px rails:
```tsx
{/* Center bar with wood rail borders */}
<WoodRail height={1} />
<CenterBar ... />
<WoodRail height={1} />
```

Replace Player 2 wrapper (lines 233-237) similarly (with inner shadow from bottom rail instead):
```tsx
<div className="flex-1 flex relative overflow-hidden">
  {/* Vignette */}
  <div className="absolute inset-0"
    style={{ background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.15) 100%)" }} />
  {/* Inner shadow from bottom rail */}
  <div className="absolute bottom-0 left-0 right-0 h-3 z-10"
    style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.3), transparent)" }} />
  <PlayerHalf ... />
</div>
<WoodRail height={7} />
```

- [ ] **Step 3: Verify visually**

Run: `npm run dev`

Navigate to an active game. Confirm:
- Wood rail bars at top and bottom (7px)
- 1px wood rail lines flanking the center bar
- Warm espresso playing surface with no blue/red gradients
- Subtle vignette and inner shadows

- [ ] **Step 4: Commit**

```bash
git add src/app/game/[id]/game-client.tsx
git commit -m "feat: add wood rail frame and warm surface to game view"
```

### Task 4: Restyle the CenterBar

**Files:**
- Modify: `src/components/center-bar.tsx`

- [ ] **Step 1: Update the center bar styling**

Replace the outer div class:
```tsx
// Before:
<div className="bg-muted/50 border-y border-border px-3 py-2 space-y-2">

// After:
<div className="px-3 py-2 space-y-2" style={{ background: "var(--surface-deep)" }}>
```

Update the score comparison colors. The leading player score should use `--foreground` (bright), non-leading uses `--text-dim`:
```tsx
<span className={`font-bold tabular-nums ${player1Total >= player2Total ? "text-foreground" : ""}`}
  style={player1Total < player2Total ? { color: "var(--text-dim)" } : undefined}>
  {player1Total}
</span>
<span style={{ color: "var(--text-dim)" }}>
  {leaderName ? `${leaderName} +${diff}` : "Tied"}
</span>
<span className={`font-bold tabular-nums ${player2Total >= player1Total ? "text-foreground" : ""}`}
  style={player2Total < player1Total ? { color: "var(--text-dim)" } : undefined}>
  {player2Total}
</span>
```

Update "End Round" button — neutral light-on-dark:
```tsx
<Button
  onClick={onEndRound}
  disabled={disabled}
  className="px-8 min-h-[48px] text-base font-bold"
  style={{
    background: "rgba(232,224,214,0.1)",
    color: "#e8e0d6",
    border: "1px solid #3d362e",
  }}
  aria-label="End the current round"
>
  End Round
</Button>
```

Update "Undo Round" — clay-toned:
```tsx
<Button
  onClick={onUndoRound}
  disabled={disabled}
  variant="outline"
  size="sm"
  className="border-destructive/30 text-destructive"
>
  Undo Round
</Button>
```

Update "Menu" button — dim text:
```tsx
<Button
  onClick={onMenuOpen}
  variant="ghost"
  size="sm"
  aria-label="Game menu"
  className="px-2"
  style={{ color: "var(--text-dim)" }}
>
  Menu
</Button>
```

- [ ] **Step 2: Verify visually**

Check that the center bar has the darker recessed background, neutral End Round button, clay-toned Undo Round, and dim Menu text.

- [ ] **Step 3: Commit**

```bash
git add src/components/center-bar.tsx
git commit -m "feat: restyle center bar with warm palette and neutral controls"
```

---

## Chunk 3: Ring Buttons & Disc Badges

### Task 5: Restyle ring buttons with earth tone gradients

**Files:**
- Modify: `src/components/ring-button.tsx`

- [ ] **Step 1: Replace the RING_COLORS map with gradient styles**

Replace the current `RING_COLORS` record with a new map that returns inline style objects instead of Tailwind classes:

```tsx
const RING_STYLES: Record<number, { background: string; color: string; boxShadow: string }> = {
  5: {
    background: "radial-gradient(circle at 40% 32%, #5a7560, #486050 50%, #3a5040)",
    color: "#ddd8d0",
    boxShadow: "0 3px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.12)",
  },
  10: {
    background: "radial-gradient(circle at 40% 32%, #6a7580, #556570 50%, #485860)",
    color: "#ddd8d0",
    boxShadow: "0 3px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.12)",
  },
  15: {
    background: "radial-gradient(circle at 40% 32%, #8e5548, #7a4438 50%, #663830)",
    color: "#ddd8d0",
    boxShadow: "0 3px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.12)",
  },
  20: {
    background: "radial-gradient(circle at 40% 32%, #c8a862, #b09050 50%, #958040)",
    color: "#1a1400",
    boxShadow: "0 3px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
  },
};
```

- [ ] **Step 2: Update the button to use inline styles**

Replace the className-based color approach with style-based:

```tsx
const ringStyle = RING_STYLES[value] || { background: "#555", color: "#fff", boxShadow: "none" };

return (
  <button
    ref={ref}
    onPointerDown={handlePointerDown}
    onPointerCancel={handlePointerCancel}
    disabled={disabled}
    style={{
      touchAction: "manipulation",
      ...ringStyle,
    }}
    aria-label={`Score ${value} points`}
    className={`
      w-20 h-20 rounded-full font-bold text-2xl select-none
      transition-all duration-150
      focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring
      ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
    `}
  >
    {value}
  </button>
);
```

- [ ] **Step 3: Verify visually**

Check that the ring buttons show earth tone gradients with dimensional lighting. Press them and confirm the scale/brightness animation still works.

- [ ] **Step 4: Commit**

```bash
git add src/components/ring-button.tsx
git commit -m "feat: restyle ring buttons with earth tone radial gradients"
```

### Task 6: Replace HAMMER/LEAD text badges with disc badges

**Files:**
- Modify: `src/components/player-half.tsx`

- [ ] **Step 1: Create the SVG icon components inline**

Add above the `PlayerHalf` function:

```tsx
function HammerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="5" y="4" width="14" height="8" rx="2" fill="#b8a898" />
      <rect x="10" y="12" width="3.5" height="8" rx="1.5" fill="#8a8078" />
    </svg>
  );
}

function LeadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M7 15l5-7 5 7" stroke="#ddd8d0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
```

- [ ] **Step 2: Create the DiscBadge wrapper**

```tsx
function DiscBadge({
  variant,
  children,
  label,
}: {
  variant: "hammer" | "lead";
  children: React.ReactNode;
  label: string;
}) {
  const styles =
    variant === "hammer"
      ? {
          background: "radial-gradient(circle at 40% 35%, #3a3430, #292420 60%, #1f1c19)",
          boxShadow: "0 2px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
        }
      : {
          background: "radial-gradient(circle at 40% 35%, #5a7560, #486050 60%, #3a5040)",
          boxShadow: "0 2px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
        };

  return (
    <div
      className="w-[34px] h-[34px] rounded-full flex items-center justify-center"
      style={styles}
      role="status"
      aria-label={label}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Replace the text badges in the PlayerHalf render**

Replace the current badge spans:

```tsx
{/* Before */}
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

{/* After */}
{hasHammer && (
  <DiscBadge variant="hammer" label="Has hammer">
    <HammerIcon />
  </DiscBadge>
)}
{isLeading && (
  <DiscBadge variant="lead" label="Leading">
    <LeadIcon />
  </DiscBadge>
)}
```

- [ ] **Step 4: Update the leading score color**

Replace the emerald leading color with the sage `--lead` token:

```tsx
{/* Before */}
<div className={`text-5xl font-bold tabular-nums ${isLeading ? "text-emerald-400" : ""}`}

{/* After */}
<div
  className="text-5xl font-bold tabular-nums"
  style={isLeading ? { color: "var(--lead)" } : undefined}
```

- [ ] **Step 5: Update text colors to use warm palette**

Update the player name span:
```tsx
{/* Before */}
<span className="text-sm uppercase tracking-widest text-muted-foreground">

{/* After — muted-foreground now maps to #8a8078 from Task 1, so this is already correct */}
<span className="text-sm uppercase tracking-widest text-muted-foreground">
```

Update the round score text color to use `--text-secondary` (`#b8a898`) — dimmer than game score (`#e8e0d6`) but brighter than muted (`#8a8078`):
```tsx
{/* Before */}
<div className="text-3xl font-semibold text-primary tabular-nums"

{/* After */}
<div className="text-3xl font-semibold tabular-nums" style={{ color: "var(--text-secondary)" }}
```

- [ ] **Step 6: Update the Undo button to use warm border**

The Undo button uses `variant="outline"`. Since `--border` is now `#3d362e` and `--input` is `#3d362e`, the outline variant will automatically use warm brown borders. No code change needed — just verify it looks right.

- [ ] **Step 7: Verify visually**

Check that:
- HAMMER shows as a dark disc with hammer silhouette (34px)
- LEAD shows as a sage disc with chevron (34px)
- Leading score is sage green
- Round score is dimmer than game score

- [ ] **Step 8: Commit**

```bash
git add src/components/player-half.tsx
git commit -m "feat: replace text badges with disc-shaped HAMMER/LEAD indicators"
```

---

## Chunk 4: Non-Game Pages

### Task 7: Restyle Home page

**Files:**
- Modify: `src/app/page.tsx`

The background and text colors are already handled by the CSS variable remapping in Task 1. This task adds the birch-toned "New Game" CTA and ensures cards use the right surface.

- [ ] **Step 1: Style the New Game button with birch gradient**

```tsx
{/* Before */}
<Button className="w-full h-14 text-lg" size="lg">
  New Game
</Button>

{/* After */}
<Button
  className="w-full h-14 text-lg font-bold"
  size="lg"
  style={{
    background: "linear-gradient(135deg, var(--rail-2), var(--rail-3))",
    color: "#1a1400",
    border: "none",
  }}
>
  New Game
</Button>
```

Apply the same treatment to the "Add Players to Get Started" button.

- [ ] **Step 2: Verify visually**

Home page should show warm espresso background, birch-toned New Game button, warm brown borders on cards. Secondary buttons (Players, Stats) should be neutral.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: restyle home page with birch CTA and warm palette"
```

### Task 8: Restyle Game Setup, Players, and Stats pages

**Files:**
- Modify: `src/app/game/new/page.tsx`
- Modify: `src/app/players/page.tsx`
- Modify: `src/app/stats/page.tsx`
- Modify: `src/components/stat-card.tsx`

Most styling is already handled by the CSS variable remapping. These are the remaining targeted changes.

- [ ] **Step 1: Style Start Game button on game setup page**

Same birch gradient treatment as New Game:

```tsx
{/* Before */}
<Button type="submit" className="w-full h-14 text-lg" size="lg">
  Start Game
</Button>

{/* After */}
<Button
  type="submit"
  className="w-full h-14 text-lg font-bold"
  size="lg"
  style={{
    background: "linear-gradient(135deg, var(--rail-2), var(--rail-3))",
    color: "#1a1400",
    border: "none",
  }}
>
  Start Game
</Button>
```

- [ ] **Step 2: Add variant prop to StatCard**

```tsx
interface StatCardProps {
  label: string;
  value: string | number;
  variant?: "positive" | "negative" | "neutral";
}

const variantColors: Record<string, string> = {
  positive: "#7a9e80",
  negative: "#8e5548",
  neutral: "var(--foreground)",
};

export function StatCard({ label, value, variant = "neutral" }: StatCardProps) {
  return (
    <div className="bg-muted/50 rounded-lg p-4 text-center">
      <div
        className="text-2xl font-bold"
        style={{ color: variantColors[variant] }}
      >
        {value}
      </div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
        {label}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Apply semantic variants in Stats page**

```tsx
<StatCard label="Record" value={`${stats.wins}W - ${stats.losses}L`} />
<StatCard label="Win %" value={`${stats.winPercent}%`} variant="positive" />
<StatCard label="Avg Margin" value={stats.avgMargin > 0 ? `+${stats.avgMargin}` : stats.avgMargin} variant={stats.avgMargin > 0 ? "positive" : stats.avgMargin < 0 ? "negative" : "neutral"} />
<StatCard label="Total 20s" value={stats.total20s} variant="positive" />
<StatCard label="Avg Round" value={stats.avgRoundScore} />
<StatCard label="Best Round" value={stats.highestRoundScore} variant="positive" />
<StatCard label="Games" value={stats.gamesPlayed} />
```

- [ ] **Step 4: Replace all emerald-400 references in game-detail.tsx**

In `src/app/game/[id]/game-detail.tsx`, replace all 4 instances of `text-emerald-400`:

```tsx
{/* Line 39 — winner announcement */}
{/* Before */}
<div className="text-lg text-emerald-400 font-semibold mb-2">
{/* After */}
<div className="text-lg font-semibold mb-2" style={{ color: "var(--lead)" }}>

{/* Line 75 — P1 round score when winning */}
{/* Before */}
<span className={`font-semibold ${p1Won ? "text-emerald-400" : ""}`}>
{/* After */}
<span className="font-semibold" style={p1Won ? { color: "var(--lead)" } : undefined}>

{/* Line 79 — P2 round score when winning */}
{/* Before */}
<span className={`font-semibold ${p2Won ? "text-emerald-400" : ""}`}>
{/* After */}
<span className="font-semibold" style={p2Won ? { color: "var(--lead)" } : undefined}>

{/* Line 85 — points awarded indicator */}
{/* Before */}
<span className="text-emerald-400">+{round.pointsAwarded}</span>
{/* After */}
<span style={{ color: "var(--lead)" }}>+{round.pointsAwarded}</span>
```

- [ ] **Step 5: Replace emerald-400 in round-summary-dialog.tsx**

```tsx
{/* Before */}
<span className="text-emerald-400 font-semibold">

{/* After */}
<span className="font-semibold" style={{ color: "var(--lead)" }}>
```

- [ ] **Step 6: Style dialog primary action buttons with birch gradient**

Apply the birch gradient to primary CTA buttons in all three dialogs:

In `src/components/game-over-dialog.tsx` — the "Rematch" button:
```tsx
{/* Before */}
<Button className="w-full" size="lg">
  Rematch
</Button>

{/* After */}
<Button
  className="w-full"
  size="lg"
  style={{
    background: "linear-gradient(135deg, var(--rail-2), var(--rail-3))",
    color: "#1a1400",
    border: "none",
  }}
>
  Rematch
</Button>
```

In `src/components/round-summary-dialog.tsx` — the "Next Round" button:
```tsx
{/* Before */}
<Button onClick={onDismiss} className="w-full" size="lg">
  Next Round
</Button>

{/* After */}
<Button
  onClick={onDismiss}
  className="w-full"
  size="lg"
  style={{
    background: "linear-gradient(135deg, var(--rail-2), var(--rail-3))",
    color: "#1a1400",
    border: "none",
  }}
>
  Next Round
</Button>
```

In `src/components/exit-menu-dialog.tsx` — the "Resume Game" button:
```tsx
{/* Before */}
<Button onClick={onClose} size="lg" className="w-full">
  Resume Game
</Button>

{/* After */}
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
```

- [ ] **Step 7: Style Stats page player selector buttons as small discs**

In `src/app/stats/page.tsx`, update the player and opponent selector buttons to be round and dimensional:

```tsx
{/* Before */}
<Button
  type="submit"
  variant={p.id === selectedPlayerId ? "default" : "outline"}
  size="sm"
>
  {p.name}
</Button>

{/* After */}
<Button
  type="submit"
  variant={p.id === selectedPlayerId ? "default" : "outline"}
  size="sm"
  className="rounded-full px-4"
  style={p.id === selectedPlayerId ? {
    background: "radial-gradient(circle at 40% 35%, #3a3430, #292420 60%, #1f1c19)",
    boxShadow: "0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
    border: "none",
  } : undefined}
>
  {p.name}
</Button>
```

Apply the same pattern to the opponent selector buttons.

- [ ] **Step 8: Verify visually**

Check all pages:
- Game setup: birch Start Game button, warm cards
- Players: warm borders, clay-toned Remove buttons
- Stats: disc-shaped player selectors, semantic-colored stat values, warm cards
- Game detail: sage green instead of emerald for winner/points
- Round summary dialog: sage green outcome text, birch Next Round button
- Game over dialog: birch Rematch button
- Exit menu dialog: birch Resume Game button

- [ ] **Step 9: Commit**

```bash
git add src/app/game/new/page.tsx src/app/players/page.tsx src/app/stats/page.tsx src/components/stat-card.tsx src/app/game/[id]/game-detail.tsx src/components/round-summary-dialog.tsx src/components/game-over-dialog.tsx src/components/exit-menu-dialog.tsx
git commit -m "feat: apply warm palette to all non-game pages and dialogs"
```

---

## Chunk 5: Dialog Styling & Final Sweep

### Task 9: Update dialog content backgrounds

**Files:**
- Modify: `src/components/ui/dialog.tsx`

The dialog content uses `bg-background` and `ring-foreground/10`. Since we remapped these variables in Task 1, the dialogs will already pick up the warm palette. But the spec calls for `--surface-raised` (`#2a2520`) for dialog backgrounds, which maps to `--card`. Since `--card` is set to `#2a2520` in our new palette, and the dialog uses `bg-background` (which is `#1f1b17`), we need to change it to `bg-card`.

- [ ] **Step 1: Update DialogContent background**

In the `DialogContent` component, replace `bg-background` with `bg-card`:

```tsx
{/* Before */}
"fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-background p-4 text-sm ring-1 ring-foreground/10 ...

{/* After */}
"fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-card p-4 text-sm ring-1 ring-foreground/10 ...
```

- [ ] **Step 2: Verify dialogs**

Trigger the Round Summary, Game Over, and Exit Menu dialogs. Confirm they show the raised surface color and warm borders.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/dialog.tsx
git commit -m "feat: update dialog background to raised surface color"
```

### Task 10: Final visual sweep and cleanup

**Files:**
- Possibly modify: any file with hardcoded neutral grays or emerald references

- [ ] **Step 1: Search for remaining hardcoded color references**

Search for any remaining `emerald`, `blue-900`, `blue-950`, `red-900`, `red-950`, `amber-500` class references that should have been replaced:

```bash
grep -rn "emerald\|blue-900\|blue-950\|red-900\|red-950\|amber-500" src/
```

Fix any found.

- [ ] **Step 2: Search for hardcoded `#ffd700`, `#c0392b`, `#2980b9`, `#27ae60`**

These are the old ring colors. They should only appear in the old CSS variables (already removed) or nowhere:

```bash
grep -rn "#ffd700\|#c0392b\|#2980b9\|#27ae60" src/
```

Fix any found.

- [ ] **Step 3: Visual walkthrough**

Walk through every page and interaction:
1. Home page — warm background, birch New Game, warm cards
2. Game setup — birch Start Game, warm pickers
3. Active game — wood rail frame, earth tone buttons, disc badges, warm center bar
4. End a round — round summary dialog in raised surface, sage winner text
5. Complete a game — game over dialog, sage winner color
6. Game detail — sage winner, warm cards for rounds
7. Stats — semantic stat colors, warm cards
8. Players — warm cards, clay remove buttons

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: clean up remaining hardcoded colors for warm palette consistency"
```
