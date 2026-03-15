# Mini Crokinole Board Scoring UI — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the ring-button scoring UI with interactive mini crokinole boards where players tap disc positions directly, with opponent disc mirroring and automatic score derivation.

**Architecture:** Data model gets two nullable Float columns (posX, posY) on Disc plus a new removeDisc server action. The UI replaces PlayerHalf's RingButton row with an SVG-based MiniBoard component. CenterBar slims to one row, Undo Round moves to ExitMenuDialog. GameClient orchestrates new callbacks (handleRemoveDisc, updated handleDiscTap with coordinates).

**Tech Stack:** Next.js 16.1 (App Router), React 19.2, Prisma 7 + SQLite, SVG for board rendering, Vitest for tests.

**Spec:** `docs/superpowers/specs/2026-03-15-mini-board-scoring-design.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/lib/board-utils.ts` | Pure functions: normalized coordinate math, ring value derivation, hit-testing |
| Create | `src/components/mini-board.tsx` | SVG board rendering, tap handling, disc rendering with flash animation |
| Create | `src/components/twenties-tray.tsx` | 20s tray: disc display, "+" button, tap-to-remove |
| Create | `tests/lib/board-utils.test.ts` | Unit tests for board-utils pure functions |
| Create | `tests/actions/remove-disc.test.ts` | Tests for the new removeDisc server action |
| Modify | `prisma/schema.prisma:59-68` | Add posX, posY Float? columns to Disc |
| Modify | `src/lib/actions/rounds.ts:7-27` | Update addDisc signature, add removeDisc action |
| Modify | `src/components/player-half.tsx` | Replace RingButton row with MiniBoard + corner layout |
| Modify | `src/components/center-bar.tsx` | Slim to single row, remove undo round |
| Modify | `src/components/exit-menu-dialog.tsx` | Add Undo Round option |
| Modify | `src/app/game/[id]/game-client.tsx` | New Disc interface fields, handleRemoveDisc, prop rewiring |
| Delete | `src/components/ring-button.tsx` | Replaced by MiniBoard tap interaction |

---

## Chunk 1: Data Layer (Schema + Server Actions + Tests)

### Task 1: Add posX/posY to Disc schema and migrate

**Files:**
- Modify: `prisma/schema.prisma:59-68`

- [ ] **Step 1: Add posX and posY columns to Disc model**

In `prisma/schema.prisma`, update the `Disc` model to add two nullable Float fields:

```prisma
model Disc {
  id        Int      @id @default(autoincrement())
  roundId   Int
  playerId  Int
  ringValue Int
  posX      Float?
  posY      Float?
  createdAt DateTime @default(now())

  round  Round  @relation(fields: [roundId], references: [id])
  player Player @relation(fields: [playerId], references: [id])
}
```

- [ ] **Step 2: Generate and run migration**

Run:
```bash
npx prisma migrate dev --name add-disc-position
```

Expected: Migration created and applied. Prisma client regenerated.

- [ ] **Step 3: Verify existing tests still pass**

Run:
```bash
npm test
```

Expected: All 36 tests pass (nullable columns don't break existing data).

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add posX/posY columns to Disc for board position tracking"
```

---

### Task 2: Create board-utils with ring value derivation and hit-testing

**Files:**
- Create: `src/lib/board-utils.ts`
- Create: `tests/lib/board-utils.test.ts`

- [ ] **Step 1: Write failing tests for `getRingValue`**

Create `tests/lib/board-utils.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { getRingValue, findDiscAtPosition } from "@/lib/board-utils";

describe("getRingValue", () => {
  it("returns 20 for center (radius 0 to <0.25)", () => {
    expect(getRingValue(0, 0)).toBe(20);
    expect(getRingValue(0.1, 0.1)).toBe(20);
    expect(getRingValue(0.17, 0.0)).toBe(20);
  });

  it("returns 15 for second ring (radius 0.25 to <0.50)", () => {
    expect(getRingValue(0.3, 0.0)).toBe(15);
    expect(getRingValue(0.0, 0.4)).toBe(15);
    expect(getRingValue(0.25, 0.25)).toBe(15); // ~0.354
  });

  it("returns 10 for third ring (radius 0.50 to <0.75)", () => {
    expect(getRingValue(0.6, 0.0)).toBe(10);
    expect(getRingValue(0.0, 0.7)).toBe(10);
  });

  it("returns 5 for outer ring (radius 0.75 to 1.0)", () => {
    expect(getRingValue(0.8, 0.0)).toBe(5);
    expect(getRingValue(0.0, 0.9)).toBe(5);
    expect(getRingValue(0.7, 0.7)).toBe(5); // ~0.99
  });

  it("scores boundary taps to the lower ring (spec rule)", () => {
    expect(getRingValue(0.25, 0.0)).toBe(15); // exactly on 20/15 line → 15
    expect(getRingValue(0.5, 0.0)).toBe(10);  // exactly on 15/10 line → 10
    expect(getRingValue(0.75, 0.0)).toBe(5);  // exactly on 10/5 line → 5
    expect(getRingValue(1.0, 0.0)).toBe(5);   // outer edge → still on board
  });

  it("returns null for taps outside the board (radius > 1.0)", () => {
    expect(getRingValue(1.0, 0.1)).toBeNull();
    expect(getRingValue(0.8, 0.8)).toBeNull(); // ~1.13
  });
});

describe("findDiscAtPosition", () => {
  const discs = [
    { id: 1, playerId: 1, ringValue: 10, posX: 0.5, posY: 0.0 },
    { id: 2, playerId: 1, ringValue: 15, posX: 0.0, posY: 0.3 },
    { id: 3, playerId: 2, ringValue: 5, posX: -0.8, posY: 0.0 },
  ];

  it("returns disc when tap is within hit radius (0.08)", () => {
    const result = findDiscAtPosition(discs, 0.52, 0.02, 1);
    expect(result?.id).toBe(1);
  });

  it("returns null when tap is not near any own disc", () => {
    const result = findDiscAtPosition(discs, 0.0, 0.0, 1);
    expect(result).toBeNull();
  });

  it("only matches own discs, not opponent discs", () => {
    const result = findDiscAtPosition(discs, -0.8, 0.0, 1);
    expect(result).toBeNull();
  });

  it("returns closest disc when multiple are within range", () => {
    const closeDiscs = [
      { id: 10, playerId: 1, ringValue: 10, posX: 0.5, posY: 0.0 },
      { id: 11, playerId: 1, ringValue: 15, posX: 0.55, posY: 0.0 },
    ];
    const result = findDiscAtPosition(closeDiscs, 0.53, 0.0, 1);
    expect(result?.id).toBe(11); // 0.53 is closer to 0.55 than to 0.5
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
npm test -- tests/lib/board-utils.test.ts
```

Expected: FAIL — module `@/lib/board-utils` not found.

- [ ] **Step 3: Implement board-utils**

Create `src/lib/board-utils.ts`:

```typescript
// Boundary line scores the LOWER ring value per spec.
// Use strict less-than for inner boundaries; outer boundary (1.0) is inclusive.
const RING_THRESHOLDS = [
  { maxRadius: 0.25, value: 20, exclusive: true },
  { maxRadius: 0.50, value: 15, exclusive: true },
  { maxRadius: 0.75, value: 10, exclusive: true },
  { maxRadius: 1.00, value: 5, exclusive: false },
] as const;

const HIT_RADIUS = 0.08;

export function getRingValue(posX: number, posY: number): number | null {
  const radius = Math.sqrt(posX * posX + posY * posY);
  for (const ring of RING_THRESHOLDS) {
    if (ring.exclusive ? radius < ring.maxRadius : radius <= ring.maxRadius) {
      return ring.value;
    }
  }
  return null; // outside the board
}

interface DiscPosition {
  id: number;
  playerId: number;
  ringValue: number;
  posX: number | null;
  posY: number | null;
}

export function findDiscAtPosition(
  discs: DiscPosition[],
  tapX: number,
  tapY: number,
  playerId: number,
): DiscPosition | null {
  let closest: DiscPosition | null = null;
  let closestDist = HIT_RADIUS;

  for (const disc of discs) {
    if (disc.playerId !== playerId) continue;
    if (disc.posX == null || disc.posY == null) continue;
    const dx = tapX - disc.posX;
    const dy = tapY - disc.posY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < closestDist) {
      closestDist = dist;
      closest = disc;
    }
  }

  return closest;
}

export { RING_THRESHOLDS, HIT_RADIUS };
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
npm test -- tests/lib/board-utils.test.ts
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/board-utils.ts tests/lib/board-utils.test.ts
git commit -m "feat: add board-utils with ring value derivation and hit-testing"
```

---

### Task 3: Update addDisc to accept posX/posY

**Files:**
- Modify: `src/lib/actions/rounds.ts:7-27`
- Modify: `tests/actions/rounds.test.ts`

- [ ] **Step 1: Write failing test for addDisc with position**

Add to `tests/actions/rounds.test.ts`, inside the `describe("addDisc")` block:

```typescript
it("stores posX and posY when provided", async () => {
  await addDisc(gameId, player1Id, 15, 0.3, -0.4);
  const game = await getGame(gameId);
  const disc = game!.rounds[0].discs[0];
  expect(disc.posX).toBeCloseTo(0.3);
  expect(disc.posY).toBeCloseTo(-0.4);
});

it("stores null posX/posY when not provided", async () => {
  await addDisc(gameId, player1Id, 10);
  const game = await getGame(gameId);
  const disc = game!.rounds[0].discs[0];
  expect(disc.posX).toBeNull();
  expect(disc.posY).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npm test -- tests/actions/rounds.test.ts
```

Expected: FAIL — addDisc doesn't accept extra args / posX not returned.

- [ ] **Step 3: Update addDisc in rounds.ts**

In `src/lib/actions/rounds.ts`, update the `addDisc` function signature and `db.disc.create` call:

```typescript
export async function addDisc(
  gameId: number,
  playerId: number,
  ringValue: number,
  posX?: number,
  posY?: number,
) {
  if (!VALID_RING_VALUES.includes(ringValue)) {
    throw new Error(`Invalid ring value: ${ringValue}. Must be 5, 10, 15, or 20.`);
  }

  const currentRound = await db.round.findFirst({
    where: { gameId, status: "in_progress" },
  });

  if (!currentRound) {
    throw new Error("No active round found");
  }

  return db.disc.create({
    data: {
      roundId: currentRound.id,
      playerId,
      ringValue,
      posX: posX ?? null,
      posY: posY ?? null,
    },
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
npm test -- tests/actions/rounds.test.ts
```

Expected: All tests pass (including existing ones).

- [ ] **Step 5: Commit**

```bash
git add src/lib/actions/rounds.ts tests/actions/rounds.test.ts
git commit -m "feat: update addDisc to accept and store posX/posY coordinates"
```

---

### Task 4: Add removeDisc server action

**Files:**
- Modify: `src/lib/actions/rounds.ts`
- Create: `tests/actions/remove-disc.test.ts`

- [ ] **Step 1: Write failing tests for removeDisc**

Create `tests/actions/remove-disc.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { createPlayer } from "@/lib/actions/players";
import { createGame, getGame } from "@/lib/actions/games";
import { addDisc, removeDisc } from "@/lib/actions/rounds";

let gameId: number;
let player1Id: number;
let player2Id: number;

beforeEach(async () => {
  const p1 = await createPlayer("Alice");
  const p2 = await createPlayer("Bob");
  player1Id = p1.id;
  player2Id = p2.id;
  const game = await createGame(player1Id, player2Id, player1Id);
  gameId = game.id;
});

describe("removeDisc", () => {
  it("removes a specific disc by ID", async () => {
    await addDisc(gameId, player1Id, 20);
    await addDisc(gameId, player1Id, 15);

    const game = await getGame(gameId);
    const firstDisc = game!.rounds[0].discs[0];

    await removeDisc(gameId, firstDisc.id);

    const updated = await getGame(gameId);
    expect(updated!.rounds[0].discs).toHaveLength(1);
    expect(updated!.rounds[0].discs[0].ringValue).toBe(15);
  });

  it("throws if disc does not belong to an in-progress round of the game", async () => {
    await addDisc(gameId, player1Id, 10);
    const game = await getGame(gameId);
    const discId = game!.rounds[0].discs[0].id;

    // Create a separate game to try removing from wrong game
    const p3 = await createPlayer("Charlie");
    const otherGame = await createGame(player1Id, p3.id, player1Id);

    await expect(removeDisc(otherGame.id, discId)).rejects.toThrow();
  });

  it("throws if disc ID does not exist", async () => {
    await expect(removeDisc(gameId, 99999)).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
npm test -- tests/actions/remove-disc.test.ts
```

Expected: FAIL — `removeDisc` is not exported from `@/lib/actions/rounds`.

- [ ] **Step 3: Implement removeDisc**

Add to `src/lib/actions/rounds.ts`, after the `undoDisc` function:

```typescript
export async function removeDisc(gameId: number, discId: number) {
  const disc = await db.disc.findUnique({
    where: { id: discId },
    include: { round: true },
  });

  if (!disc) {
    throw new Error("Disc not found");
  }

  if (disc.round.gameId !== gameId || disc.round.status !== "in_progress") {
    throw new Error("Disc does not belong to an active round of this game");
  }

  return db.disc.delete({ where: { id: discId } });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
npm test -- tests/actions/remove-disc.test.ts
```

Expected: All 3 tests pass.

- [ ] **Step 5: Run all tests to verify nothing broke**

Run:
```bash
npm test
```

Expected: All tests pass (36 existing + 14 new = 50).

- [ ] **Step 6: Commit**

```bash
git add src/lib/actions/rounds.ts tests/actions/remove-disc.test.ts
git commit -m "feat: add removeDisc server action for tap-to-remove by disc ID"
```

---

## Chunk 2: UI Components (MiniBoard, TwentiesTray, PlayerHalf rewrite)

> **Note:** After this chunk, the codebase will not compile cleanly until Chunk 3 rewires `GameClient` to match the new component interfaces. Individual new components (Tasks 5-6) can be type-checked in isolation. Tasks 7-9 modify existing component interfaces and will break `GameClient` call sites until Task 10.

### Task 5: Create MiniBoard SVG component

**Files:**
- Create: `src/components/mini-board.tsx`

- [ ] **Step 1: Create the MiniBoard component**

Create `src/components/mini-board.tsx`. The board uses an SVG with viewBox `"-1 -1 2 2"` so coordinates map directly to the normalized -1 to 1 range. Key behaviors:

- Renders 4 concentric ring fills with distinct boundary lines between them
- On `pointerdown`: converts screen coords to SVG coords, hit-tests own discs (tap-to-remove), else derives ring value and calls `onPlace`
- Renders own discs (solid, with position from props) and opponent discs (different color, positions negated for 180° rotation)
- On placement, shows ring value text on disc for 1.5s then fades

```typescript
"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { getRingValue, findDiscAtPosition } from "@/lib/board-utils";

interface DiscData {
  id: number;
  playerId: number;
  ringValue: number;
  posX: number | null;
  posY: number | null;
}

interface MiniBoardProps {
  discs: DiscData[];
  playerId: number;
  opponentDiscs: DiscData[];
  onPlace: (ringValue: number, posX: number, posY: number) => void;
  onRemove: (discId: number) => void;
  disabled?: boolean;
  maxDiscs?: number;
  isPlayer1?: boolean;
}

// Ring visual boundaries (normalized radius)
const RINGS = [
  { r: 1.0, fill: "#2a3530", stroke: "#4a6050", label: "5" },
  { r: 0.75, fill: "#283038", stroke: "#4a6050", label: "10" },
  { r: 0.50, fill: "#3a2820", stroke: "#4a6050", label: "15" },
  { r: 0.25, fill: "#1a1400", stroke: "#4a3a20", label: "20" },
];

const LIGHT_DISC = {
  fill: "url(#lightDisc)",
  stroke: "#a09888",
};
const DARK_DISC = {
  fill: "url(#darkDisc)",
  stroke: "#6a6460",
};

const DISC_RADIUS = 0.065;

export function MiniBoard({
  discs,
  playerId,
  opponentDiscs,
  onPlace,
  onRemove,
  disabled = false,
  maxDiscs = 8,
  isPlayer1 = false,
}: MiniBoardProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [flashingDiscId, setFlashingDiscId] = useState<number | null>(null);
  const [flashValue, setFlashValue] = useState<number | null>(null);

  // Clear flash after 1.5s
  useEffect(() => {
    if (flashingDiscId == null) return;
    const timer = setTimeout(() => {
      setFlashingDiscId(null);
      setFlashValue(null);
    }, 1500);
    return () => clearTimeout(timer);
  }, [flashingDiscId]);

  const ownDiscCount = discs.filter((d) => d.playerId === playerId).length;
  const atLimit = ownDiscCount >= maxDiscs;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();

      const svg = svgRef.current;
      if (!svg) return;

      // Convert screen coords to SVG coords
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const svgPt = pt.matrixTransform(svg.getScreenCTM()!.inverse());
      const posX = svgPt.x;
      const posY = svgPt.y;

      // Hit-test own discs only (tap-to-remove)
      const hitDisc = findDiscAtPosition(discs, posX, posY, playerId);
      if (hitDisc) {
        // Flash the value briefly before removing
        setFlashingDiscId(hitDisc.id);
        setFlashValue(hitDisc.ringValue);
        setTimeout(() => {
          onRemove(hitDisc.id);
          setFlashingDiscId(null);
          setFlashValue(null);
        }, 300);
        return;
      }

      // Placement — check if within board and not at limit
      if (atLimit) return;
      const ringValue = getRingValue(posX, posY);
      if (ringValue == null) return;

      onPlace(ringValue, posX, posY);
    },
    [disabled, discs, opponentDiscs, playerId, onPlace, onRemove, atLimit],
  );

  // Determine disc colors based on player
  const ownStyle = isPlayer1 ? LIGHT_DISC : DARK_DISC;
  const opponentStyle = isPlayer1 ? DARK_DISC : LIGHT_DISC;

  return (
    <svg
      ref={svgRef}
      viewBox="-1.05 -1.05 2.1 2.1"
      className="w-full h-full max-w-[260px] max-h-[260px]"
      style={{ touchAction: "none" }}
      onPointerDown={handlePointerDown}
      aria-label="Crokinole scoring board"
    >
      <defs>
        <radialGradient id="lightDisc" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#e8dcc8" />
          <stop offset="100%" stopColor="#c8b898" />
        </radialGradient>
        <radialGradient id="darkDisc" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#4a4440" />
          <stop offset="100%" stopColor="#2a2420" />
        </radialGradient>
      </defs>

      {/* Board background */}
      <circle cx={0} cy={0} r={1.02} fill="#1e2520" />

      {/* Rings (outer to inner) */}
      {RINGS.map((ring) => (
        <circle
          key={ring.label}
          cx={0}
          cy={0}
          r={ring.r}
          fill={ring.fill}
          stroke={ring.stroke}
          strokeWidth={0.02}
        />
      ))}

      {/* Center hole shadow */}
      <circle cx={0} cy={0} r={0.23} fill="#0a0800" opacity={0.6} />

      {/* Ring labels (subtle) */}
      <text x={0} y={0.92} textAnchor="middle" fill="rgba(221,216,208,0.3)" fontSize={0.08} fontWeight="bold">5</text>
      <text x={0} y={0.67} textAnchor="middle" fill="rgba(221,216,208,0.3)" fontSize={0.08} fontWeight="bold">10</text>
      <text x={0} y={0.42} textAnchor="middle" fill="rgba(221,216,208,0.3)" fontSize={0.08} fontWeight="bold">15</text>
      <text x={0} y={0.05} textAnchor="middle" fill="rgba(200,168,98,0.5)" fontSize={0.08} fontWeight="bold">20</text>

      {/* Opponent discs (positions negated for 180° rotation) */}
      {opponentDiscs.map((disc) =>
        disc.posX != null && disc.posY != null ? (
          <circle
            key={`opp-${disc.id}`}
            cx={-disc.posX}
            cy={-disc.posY}
            r={DISC_RADIUS}
            fill={opponentStyle.fill}
            stroke={opponentStyle.stroke}
            strokeWidth={0.012}
            style={{ filter: "drop-shadow(0 0.01px 0.03px rgba(0,0,0,0.5))" }}
          />
        ) : null,
      )}

      {/* Own discs */}
      {discs
        .filter((d) => d.playerId === playerId)
        .map((disc) =>
          disc.posX != null && disc.posY != null ? (
            <g key={`own-${disc.id}`}>
              <circle
                cx={disc.posX}
                cy={disc.posY}
                r={DISC_RADIUS}
                fill={ownStyle.fill}
                stroke={ownStyle.stroke}
                strokeWidth={0.012}
                style={{ filter: "drop-shadow(0 0.01px 0.03px rgba(0,0,0,0.5))" }}
              />
              {/* Value flash */}
              {flashingDiscId === disc.id && flashValue != null && (
                <text
                  x={disc.posX}
                  y={disc.posY + 0.025}
                  textAnchor="middle"
                  fill={isPlayer1 ? "#1a1400" : "#ddd8d0"}
                  fontSize={0.06}
                  fontWeight="bold"
                  style={{ pointerEvents: "none" }}
                >
                  {flashValue}
                </text>
              )}
            </g>
          ) : null,
        )}
    </svg>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run:
```bash
npx next build 2>&1 | head -20
```

Expected: No TypeScript errors related to mini-board.tsx (build may fail for other reasons but no type errors in this file).

- [ ] **Step 3: Commit**

```bash
git add src/components/mini-board.tsx
git commit -m "feat: add MiniBoard SVG component with tap-to-place and tap-to-remove"
```

---

### Task 6: Create TwentiesTray component

**Files:**
- Create: `src/components/twenties-tray.tsx`

- [ ] **Step 1: Create the TwentiesTray component**

Create `src/components/twenties-tray.tsx`:

```typescript
"use client";

interface TwentiesDisc {
  id: number;
}

interface TwentiesTrayProps {
  discs: TwentiesDisc[];
  onAdd: () => void;
  onRemove: (discId: number) => void;
  disabled?: boolean;
  isPlayer1?: boolean;
}

export function TwentiesTray({
  discs,
  onAdd,
  onRemove,
  disabled = false,
  isPlayer1 = false,
}: TwentiesTrayProps) {
  const discColor = isPlayer1
    ? "radial-gradient(circle at 40% 35%, #c8a862, #b09050)"
    : "radial-gradient(circle at 40% 35%, #4a4440, #2a2420)";

  return (
    <div className="flex items-center gap-1">
      <span
        className="text-[8px] uppercase tracking-wider"
        style={{ color: "var(--text-dim, #8a8078)" }}
      >
        20s
      </span>
      <div className="flex items-center gap-[3px]">
        {discs.map((disc) => (
          <button
            key={disc.id}
            onClick={() => !disabled && onRemove(disc.id)}
            disabled={disabled}
            className="w-4 h-4 rounded-full border-0 p-0 cursor-pointer disabled:cursor-not-allowed"
            style={{
              background: discColor,
              boxShadow: "0 1px 2px rgba(0,0,0,0.4)",
            }}
            aria-label="Remove 20-point disc"
          />
        ))}
        {/* "+" button to add a 20 */}
        <button
          onClick={() => !disabled && onAdd()}
          disabled={disabled}
          className="w-5 h-5 rounded-full flex items-center justify-center border p-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            borderColor: "var(--text-dim, #3d362e)",
            background: "transparent",
            color: "var(--text-dim, #8a8078)",
            fontSize: "12px",
            lineHeight: 1,
          }}
          aria-label="Add 20-point disc"
        >
          +
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/twenties-tray.tsx
git commit -m "feat: add TwentiesTray component for hole-shot disc display"
```

---

### Task 7: Rewrite PlayerHalf with corner layout and MiniBoard

**Files:**
- Modify: `src/components/player-half.tsx`

- [ ] **Step 1: Rewrite PlayerHalf**

Replace the entire content of `src/components/player-half.tsx`. The new layout uses `position: relative` with absolute-positioned corners and a centered MiniBoard:

```typescript
"use client";

import { MiniBoard } from "./mini-board";
import { TwentiesTray } from "./twenties-tray";
import { Button } from "@/components/ui/button";

interface DiscData {
  id: number;
  playerId: number;
  ringValue: number;
  posX: number | null;
  posY: number | null;
}

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
  onUndo: () => void;
  disabled?: boolean;
}

function HammerIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <rect x="5" y="4" width="14" height="8" rx="2" fill="#b8a898" />
      <rect x="10" y="12" width="3.5" height="8" rx="1.5" fill="#8a8078" />
    </svg>
  );
}

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
  onUndo,
  disabled,
}: PlayerHalfProps) {
  // Filter 20s for the tray
  const twenties = discs.filter(
    (d) => d.playerId === playerId && d.ringValue === 20,
  );

  return (
    <div
      className={`flex-1 relative ${isRotated ? "rotate-180" : ""}`}
      aria-label={`${name}'s scoring area`}
    >
      {/* Top-left: Name + Hammer */}
      <div className="absolute top-2 left-3 z-10">
        <div
          className="text-[10px] uppercase tracking-widest"
          style={{ color: "var(--text-dim, #8a8078)" }}
        >
          {name}
        </div>
        {hasHammer && (
          <div className="mt-0.5">
            <HammerIcon />
          </div>
        )}
      </div>

      {/* Top-right: Round score + disc count */}
      <div className="absolute top-2 right-3 z-10 text-right">
        <div
          className="text-2xl font-bold tabular-nums"
          style={{ color: "var(--foreground, #ddd8d0)", lineHeight: 1 }}
          aria-label={`Round score: ${roundScore}`}
          aria-live="polite"
        >
          +{roundScore}
        </div>
        <div
          className="text-[10px] mt-0.5"
          style={{ color: "var(--text-dim, #8a8078)" }}
        >
          {discCount} of 8
        </div>
      </div>

      {/* Center: MiniBoard */}
      <div className="absolute inset-0 flex items-center justify-center p-2">
        <MiniBoard
          discs={discs}
          playerId={playerId}
          opponentDiscs={opponentDiscs}
          onPlace={onPlace}
          onRemove={onRemove}
          disabled={disabled}
          maxDiscs={8}
          isPlayer1={isPlayer1}
        />
      </div>

      {/* Bottom-left: 20s tray */}
      <div className="absolute bottom-2 left-3 z-10">
        <TwentiesTray
          discs={twenties}
          onAdd={() => onPlace(20, 0, 0)}
          onRemove={onRemove}
          disabled={disabled}
          isPlayer1={isPlayer1}
        />
      </div>

      {/* Bottom-right: Undo */}
      <div className="absolute bottom-2 right-3 z-10">
        <Button
          onClick={onUndo}
          disabled={disabled || roundScore === 0}
          variant="outline"
          className="h-7 px-3 text-xs"
          aria-label={`Undo ${name}'s last disc`}
        >
          Undo
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/player-half.tsx
git commit -m "feat: rewrite PlayerHalf with corner layout and MiniBoard"
```

---

### Task 8: Slim down CenterBar

**Files:**
- Modify: `src/components/center-bar.tsx`

- [ ] **Step 1: Rewrite CenterBar to single row**

Replace `src/components/center-bar.tsx`:

```typescript
"use client";

import { Button } from "@/components/ui/button";

interface CenterBarProps {
  roundNumber: number;
  player1Total: number;
  player2Total: number;
  onEndRound: () => void;
  onMenuOpen: () => void;
  disabled?: boolean;
}

export function CenterBar({
  roundNumber,
  player1Total,
  player2Total,
  onEndRound,
  onMenuOpen,
  disabled,
}: CenterBarProps) {
  return (
    <div
      className="px-3 py-1.5 flex items-center justify-between"
      style={{ background: "var(--surface-deep)" }}
    >
      {/* Menu icon */}
      <button
        onClick={onMenuOpen}
        className="w-7 h-7 flex items-center justify-center rounded-full opacity-50"
        aria-label="Game menu"
        style={{ background: "transparent", border: "none", cursor: "pointer" }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--text-dim, #8a8078)">
          <circle cx="12" cy="5" r="2.5" />
          <circle cx="12" cy="12" r="2.5" />
          <circle cx="12" cy="19" r="2.5" />
        </svg>
      </button>

      {/* P1 score */}
      <span
        className="text-base font-bold tabular-nums"
        style={{ color: "var(--foreground, #ddd8d0)" }}
      >
        {player1Total}
      </span>

      {/* Round badge + End Round */}
      <div className="flex items-center gap-2">
        <span
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
          style={{
            color: "var(--text-dim, #8a8078)",
            background: "rgba(255,255,255,0.04)",
          }}
        >
          R{roundNumber}
        </span>
        <Button
          onClick={onEndRound}
          disabled={disabled}
          className="px-5 min-h-[40px] text-sm font-bold"
          style={{
            background: "rgba(232,224,214,0.1)",
            color: "#e8e0d6",
            border: "1px solid #3d362e",
          }}
          aria-label="End the current round"
        >
          End Round
        </Button>
      </div>

      {/* P2 score */}
      <span
        className="text-base font-bold tabular-nums"
        style={{ color: "var(--foreground, #ddd8d0)" }}
      >
        {player2Total}
      </span>

      {/* Spacer to balance menu icon */}
      <div className="w-7" />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/center-bar.tsx
git commit -m "feat: slim CenterBar to single row with menu icon"
```

---

### Task 9: Add Undo Round to ExitMenuDialog

**Files:**
- Modify: `src/components/exit-menu-dialog.tsx`

- [ ] **Step 1: Add onUndoRound and canUndoRound props**

In `src/components/exit-menu-dialog.tsx`, update the interface and add the Undo Round button between "Resume Game" and "Save & Exit":

Update the interface at line 15-19:

```typescript
interface ExitMenuDialogProps {
  open: boolean;
  onClose: () => void;
  gameId: number;
  onUndoRound?: () => void;
  canUndoRound?: boolean;
}
```

Update the function signature at line 21:

```typescript
export function ExitMenuDialog({
  open,
  onClose,
  gameId,
  onUndoRound,
  canUndoRound = false,
}: ExitMenuDialogProps) {
```

Add the Undo Round button in the non-confirming menu section (after "Resume Game", before the `<Link>` to home), around line 81:

```tsx
{canUndoRound && onUndoRound && (
  <Button
    variant="outline"
    size="lg"
    className="w-full border-destructive/30 text-destructive"
    onClick={() => {
      onUndoRound();
      onClose();
    }}
  >
    Undo Last Round
  </Button>
)}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/exit-menu-dialog.tsx
git commit -m "feat: add Undo Round option to ExitMenuDialog"
```

---

## Chunk 3: Wiring (GameClient integration + cleanup)

### Task 10: Rewire GameClient for new components

**Files:**
- Modify: `src/app/game/[id]/game-client.tsx`

- [ ] **Step 1: Update Disc interface and imports**

In `src/app/game/[id]/game-client.tsx`:

Update the import from `@/lib/actions/rounds` to include `removeDisc`:

```typescript
import { addDisc, undoDisc, removeDisc, endRound, undoRound } from "@/lib/actions/rounds";
```

Update the `Disc` interface (find `interface Disc {`) to add position fields:

```typescript
interface Disc {
  id: number;
  playerId: number;
  ringValue: number;
  posX: number | null;
  posY: number | null;
}
```

- [ ] **Step 2: Update handleDiscTap to include position**

Replace the `handleDiscTap` callback (find `const handleDiscTap = useCallback`):

```typescript
const handleDiscTap = useCallback(
  (playerId: number, ringValue: number, posX: number, posY: number) => {
    const tempId = nextLocalId.current--;
    setLocalDiscs((prev) => [...prev, { id: tempId, playerId, ringValue, posX, posY }]);
    addDisc(game.id, playerId, ringValue, posX, posY).catch(() => {
      setLocalDiscs((prev) => prev.filter((d) => d.id !== tempId));
    });
  },
  [game.id],
);
```

- [ ] **Step 3: Add handleRemoveDisc callback**

Add after the `handleUndo` callback:

```typescript
const handleRemoveDisc = useCallback(
  (discId: number) => {
    // Capture disc for revert inside updater to avoid stale closure
    let removedDisc: Disc | undefined;
    setLocalDiscs((prev) => {
      removedDisc = prev.find((d) => d.id === discId);
      return prev.filter((d) => d.id !== discId);
    });

    // Skip server call for temp discs (negative IDs)
    if (discId < 0) return;

    removeDisc(game.id, discId).catch(() => {
      if (removedDisc) {
        setLocalDiscs((prev) => [...prev, removedDisc!]);
      }
    });
  },
  [game.id],
);
```

- [ ] **Step 4: Compute per-player disc data**

Add after the `leader` computation (find `const leader:`):

```typescript
const player1Discs = localDiscs.filter((d) => d.playerId === game.player1Id);
const player2Discs = localDiscs.filter((d) => d.playerId === game.player2Id);
const player1DiscCount = player1Discs.length;
const player2DiscCount = player2Discs.length;
```

- [ ] **Step 5: Update PlayerHalf props in JSX**

Replace the Player 1 `<PlayerHalf>` JSX block (find first `<PlayerHalf` in the return):

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
  onUndo={() => handleUndo(game.player1Id)}
  disabled={isGameOver || isPending}
/>
```

Replace the Player 2 `<PlayerHalf>` JSX block (find second `<PlayerHalf` in the return):

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
  onUndo={() => handleUndo(game.player2Id)}
  disabled={isGameOver || isPending}
/>
```

- [ ] **Step 6: Update CenterBar props**

Replace the `<CenterBar>` JSX block (find `<CenterBar`):

```tsx
<CenterBar
  roundNumber={currentRound?.roundNumber ?? game.rounds.length}
  player1Total={p1Total}
  player2Total={p2Total}
  onEndRound={handleEndRound}
  onMenuOpen={() => setShowExitMenu(true)}
  disabled={isPending || isGameOver}
/>
```

- [ ] **Step 7: Update ExitMenuDialog props**

Replace the `<ExitMenuDialog>` JSX block (find `<ExitMenuDialog`):

```tsx
<ExitMenuDialog
  open={showExitMenu}
  onClose={() => setShowExitMenu(false)}
  gameId={game.id}
  onUndoRound={handleUndoRound}
  canUndoRound={completedRoundCount > 0}
/>
```

- [ ] **Step 8: Commit**

```bash
git add src/app/game/[id]/game-client.tsx
git commit -m "feat: rewire GameClient for MiniBoard with position tracking and removeDisc"
```

---

### Task 11: Delete RingButton component

**Files:**
- Delete: `src/components/ring-button.tsx`

- [ ] **Step 1: Verify no remaining imports of RingButton**

Run a search across the codebase:
```bash
grep -r "ring-button\|RingButton" src/
```

Expected: No results (PlayerHalf no longer imports it).

- [ ] **Step 2: Delete the file**

```bash
rm src/components/ring-button.tsx
```

- [ ] **Step 3: Commit**

```bash
git add -u src/components/ring-button.tsx
git commit -m "chore: delete RingButton component (replaced by MiniBoard)"
```

---

### Task 12: Build and manual smoke test

- [ ] **Step 1: Run all tests**

```bash
npm test
```

Expected: All tests pass (41 total).

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
- Mini boards render on both player halves
- Tapping a ring places a disc at the tap position with value flash
- Opponent's disc appears on the other player's board (rotated 180°)
- 20s tray shows discs that went in the hole, "+" adds, tap removes
- Undo removes last disc
- Tap-to-remove works on own discs
- End Round works, scores calculate correctly
- Menu opens with Undo Round option
- 8-disc limit prevents further placement
- Player 1's half is correctly rotated 180°

- [ ] **Step 4: Final commit if any fixups needed**

Review `git status` and stage only relevant changed files explicitly (do not use `git add -A` to avoid staging unrelated files in `.superpowers/` or `docs/`):

```bash
git status
# Stage specific files that were fixed, e.g.:
# git add src/components/mini-board.tsx src/components/player-half.tsx
git commit -m "fix: post-integration adjustments for mini board scoring"
```
