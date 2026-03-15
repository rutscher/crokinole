# New Game Screen Redesign

## Problem

The current new game screen uses dropdown selects for player and hammer selection. These are awkward on mobile (Radix popovers instead of native controls), don't scale well to many players, and lack a way to quickly find recent opponents. The screen also allows selecting the same player for both slots, and shows all players in the hammer picker rather than just the two selected.

## Design

### Overview

Replace the current form-based new game screen with a two-step interactive flow:

1. **Player selection** — unified tap-to-assign list with recent player chips and search-as-you-type
2. **Hammer + start** — hammer toggle between the two selected players (or random), plus Start Game button

The screen uses a narrow column layout with a prominent matchup hero card at the top that fills in as players are selected.

### Architecture

**Single client component approach.** The server page (`src/app/game/new/page.tsx`) fetches data and renders `<NewGameClient>`. All interactive state lives client-side. The server page exports `dynamic = "force-dynamic"` to prevent stale player data.

### Backend Changes

**New server action: `getRecentPlayers(limit?: number)`** in `src/lib/actions/players.ts`

Queries the Game table (both in-progress and completed games) for distinct player IDs from `player1Id` and `player2Id`. Each player is ranked by the `createdAt` of their most recent game appearance. Returns up to `limit` (default 8) Player objects by joining back to the Player table (the JOIN naturally excludes players that have been hard-deleted). Global recents (no identity system yet).

Pseudocode:
```
SELECT DISTINCT playerId, MAX(game.createdAt) as lastPlayed
FROM (
  SELECT player1Id as playerId, createdAt FROM Game
  UNION ALL
  SELECT player2Id as playerId, createdAt FROM Game
)
JOIN Player ON Player.id = playerId
GROUP BY playerId
ORDER BY lastPlayed DESC
LIMIT :limit
```

Since this requires a UNION, use Prisma raw query (`db.$queryRaw`) or two queries merged in JS.

**Server page:** Becomes thin — fetches `getPlayers()` and `getRecentPlayers()`, passes both to `<NewGameClient>`. Resolves optional `searchParams` (`?p1=<id>&p2=<id>`) for rematch pre-selection and passes as `defaultPlayer1Id` and `defaultPlayer2Id` props.

### Client Component

**File:** `src/components/new-game-client.tsx`

**Props:**
- `players: Player[]` — all players
- `recentPlayers: Player[]` — recent opponents
- `defaultPlayer1Id?: number` — pre-select P1 (from rematch searchParams)
- `defaultPlayer2Id?: number` — pre-select P2 (from rematch searchParams)

When both defaults are provided, initialize with both slots filled and start on "confirm" step. When only one is provided, fill P1 and start on "select". If a default ID does not match any player in the `players` array (e.g., player was deleted), ignore it.

**State:**
- `player1: Player | null` — selected P1
- `player2: Player | null` — selected P2
- `searchQuery: string` — current search input
- `step: "select" | "confirm"` — current view

**Step: "select" (player selection)**
- Matchup hero card at top showing filled names or placeholders
- Tapping a filled name in the hero card deselects that player
- Recent player chips below the hero card (exclude already-selected player)
- Search bar below chips — typing filters the full player list, results appear below. Do not auto-focus the search input (avoids triggering the mobile keyboard when the user wants to tap a chip).
- Tapping a player assigns to the first empty slot (P1 first, then P2)
- When both slots fill, auto-advance to "confirm" step

**Step: "confirm" (hammer + start)**
- Matchup hero card with both names filled
- Tapping a name in the hero card deselects that player and returns to "select" step
- Hammer toggle: three buttons — P1 name / Random / P2 name (Random selected by default)
- Start Game button — resolves "Random" hammer client-side (both player objects are in state), then calls `createGame(player1.id, player2.id, hammerPlayerId)` directly. On success, navigates with `router.push(/game/${game.id})`. Button disables on press to prevent double-clicks; re-enables on error.
- Back button returns to "select" step, preserves P1, clears P2 (undoes the last selection)

The inline `handleCreate` server action in the current page is deleted.

### Search & Filtering

- Substring match, case-insensitive, on the local player array
- Already-selected player excluded from search results and chips
- No debounce needed (local array filtering)
- Clearing search hides the results list
- On player selection from search results, blur the search input to dismiss the mobile keyboard
- No matches: "No players found" message
- No recent players (first game): chips section hidden, just search bar

### Visual Design

**Layout:** Narrow column (`max-w-md mx-auto`, `min-h-screen`), consistent with all other app pages.

**Matchup hero card:**
- Rounded card with subtle border and gradient background
- Two sides: P1 and P2 with vertical "VS" divider in rail gold (`--rail-2`)
- Filled: large bold name with small "Player 1/2" label, labels in `--lead` green
- Empty: muted placeholder text, labels in `--text-dim`

**Recent chips:**
- Pill-shaped (`rounded-full`)
- Default: `bg-secondary text-foreground`
- Already-selected player excluded from chips (not shown)

**Search bar:**
- Standard input styling (`bg-secondary border`)
- Magnifying glass icon, placeholder text
- Results: full-width rows below the search bar

**Hammer toggle:**
- Three equal buttons in a row: P1 name / Random / P2 name
- Selected: border and text in rail gold (`--rail-2`), bold
- Random selected by default

**Start Game button:** Gradient (`--rail-2` to `--rail-3`), matching home page CTA.

### Deleted Code

`PlayerPicker` (`src/components/player-picker.tsx`) and `HammerPicker` (`src/components/hammer-picker.tsx`) become unused and are removed.

### Navigation

- Back from "confirm" → "select" step (P1 preserved, P2 cleared)
- Back from "select" → home page (existing Back link)
- Tap name in hero card → deselects that player (either step)

### Edge Cases

- **Fewer than 2 players:** The existing guard is preserved — show "Need More Players" message with link to `/players`.
- **Rematch pre-selection:** When `?p1` and `?p2` searchParams are present, pre-fill slots and start on confirm step.

### Testing

- `getRecentPlayers` action: returns players ordered by most recent game appearance, respects limit, returns empty array when no games exist
- Existing `createGame` tests remain unchanged
