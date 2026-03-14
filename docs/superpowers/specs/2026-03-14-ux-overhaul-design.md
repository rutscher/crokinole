# Crokinole Scorekeeper — Board-Inspired UI Overhaul

## Goal

Redesign the app's visual identity so it feels like a natural extension of a crokinole board. The scoring interface should minimize cognitive switching between playing and recording scores. The rest of the app should live in the same warm, material world without being kitschy or over-the-top.

## Design Principles

1. **The board frame is reserved for gameplay** — the game view gets the wood rail border; other pages share the palette but not the frame
2. **Restraint over simulation** — proper lighting and shadows create material feel; no CSS hacks pretending to be wood grain
3. **Earth tones over digital colors** — ring buttons shift from saturated gold/red/blue/green to sage/slate/clay/brass
4. **The wood rail is the accent** — UI controls (buttons, badges) stay neutral so the birch rail is the only warm gold element
5. **Icons over text** — HAMMER and LEAD are disc-shaped graphic indicators, not text pills

## Color Palette

### Surfaces
| Token | Value | Usage |
|-------|-------|-------|
| `--surface` | `#1f1b17` | Primary background (warm espresso) |
| `--surface-deep` | `#1a1610` | Center bar, recessed areas |
| `--surface-raised` | `#2a2520` | Cards, elevated surfaces |

### Wood Rail
| Token | Value | Usage |
|-------|-------|-------|
| `--rail-1` | `#b59768` | Rail gradient stop |
| `--rail-2` | `#cbb48a` | Rail gradient stop (lightest) |
| `--rail-3` | `#a8905c` | Rail gradient stop |
| `--rail-4` | `#c4a87a` | Rail gradient stop |

Applied as: `linear-gradient(90deg, var(--rail-1), var(--rail-2), var(--rail-3), var(--rail-4), var(--rail-1))`

Rail has a subtle top-light sheen: `linear-gradient(180deg, rgba(255,255,255,0.1), transparent)` overlay.

### Ring Button Earth Tones
| Ring | Name | Center | Mid | Edge | Text |
|------|------|--------|-----|------|------|
| 5 | Sage | `#5a7560` | `#486050` | `#3a5040` | `#ddd8d0` |
| 10 | Slate | `#6a7580` | `#556570` | `#485860` | `#ddd8d0` |
| 15 | Clay | `#8e5548` | `#7a4438` | `#663830` | `#ddd8d0` |
| 20 | Brass | `#c8a862` | `#b09050` | `#958040` | `#1a1400` |

All ring buttons use the gradient pattern: `radial-gradient(circle at 40% 32%, <center>, <mid> 50%, <edge>)` — substitute the hex values from the table above. Example for Sage: `radial-gradient(circle at 40% 32%, #5a7560, #486050 50%, #3a5040)`. Shadow: `box-shadow: 0 3px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.12)` for dimensional lighting from top-left.

### Text
| Token | Value | Usage |
|-------|-------|-------|
| `--text-primary` | `#e8e0d6` | Primary text, scores |
| `--text-secondary` | `#b8a898` | Round scores, labels |
| `--text-muted` | `#8a8078` | Player names, subtle UI |
| `--text-dim` | `#6b5f53` | Least prominent text |

### Status Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--lead` | `#7a9e80` | Leading player score, lead disc badge |
| `--lead-bg` | `rgba(90,117,96,0.15)` | Lead badge background tint |
| `--destructive` | `#8e5548` | Undo Round (clay-toned) |
| `--destructive-border` | `rgba(140,80,72,0.25)` | Undo Round border |

### Borders
| Token | Value | Usage |
|-------|-------|-------|
| `--crk-border` | `#3d362e` | Standard borders (warm brown) |
| `--crk-border-subtle` | `rgba(180,170,155,0.15)` | Badge outlines, faint dividers |

Note: Token names are prefixed with `crk-` to avoid collisions with existing shadcn/ui CSS variable names (`--border`, `--background`, etc.). During implementation, either replace the shadcn defaults in the `@theme inline` block or use these prefixed names alongside them. The shadcn variables should be updated to map to the new warm values where they overlap.

## Game View (Primary Focus)

### Layout Structure

```
┌─────────────────────────────┐
│ ▓▓▓ WOOD RAIL (7px) ▓▓▓▓▓ │
│                             │
│   Player 1 (rotated 180°)   │
│   Name + Disc Badges        │
│   Game Score                 │
│   Round Score                │
│   [5] [10] [15] [20]        │
│   [Undo]                    │
│                             │
│ ▓▓▓ WOOD RAIL (1px) ▓▓▓▓▓ │
│ ┌─── CENTER BAR ──────────┐ │
│ │  40  Rob +10  30        │ │
│ │  Menu  UndoRnd  EndRnd  │ │
│ └─────────────────────────┘ │
│ ▓▓▓ WOOD RAIL (1px) ▓▓▓▓▓ │
│                             │
│   Player 2 (normal)         │
│   Name + Disc Badges        │
│   Game Score                 │
│   Round Score                │
│   [20] [15] [10] [5]        │
│   [Undo]                    │
│                             │
│ ▓▓▓ WOOD RAIL (7px) ▓▓▓▓▓ │
└─────────────────────────────┘
```

### Wood Rail
- Top and bottom: 7px birch gradient bars with light sheen overlay
- Flanking center bar: 1px birch gradient lines with sheen
- Inner shadow cast onto the playing surface: `linear-gradient(180deg, rgba(0,0,0,0.3), transparent)` for 12px below top rail (and mirrored above bottom rail)

### Playing Surface
- Background: `#1f1b17` (warm espresso)
- Vignette: `radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.15) 100%)`
- No blue/red player gradients — both player halves use flat `--surface` background. The leading player is indicated by green-tinted score text (`--lead`) and the sage disc badge, not background color. Position (top vs bottom) is the primary player differentiator.

### Ring Buttons
- 80px diameter circles (`w-20 h-20`, unchanged from current) with earth tone radial gradients (see palette)
- Top-left light source via `radial-gradient(circle at 40% 32%, ...)`
- Dimensional shadow: `box-shadow: 0 3px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.12)`
- Press animation: scale 75% + brightness 150% (150ms) — unchanged from current

### Status Indicators (Disc Badges)

**HAMMER** — 34px dark disc with hammer icon inside:
- Disc: `radial-gradient(circle at 40% 35%, #3a3430, #292420 60%, #1f1c19)`
- Shadow: `0 2px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)`
- Icon: SVG hammer silhouette in side profile — rectangular mallet head (horizontal, ~14x8px proportions, rounded corners, filled `#b8a898`) with vertical handle below (centered, ~3x9px proportions, filled `#8a8078`). ViewBox: `0 0 24 24`. Filled paths, no stroke.

**LEAD** — 34px sage disc with upward chevron inside:
- Disc: `radial-gradient(circle at 40% 35%, #5a7560, #486050 60%, #3a5040)`
- Shadow: `0 2px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)`
- Icon: SVG chevron pointing up in `#ddd8d0`

Both placed inline next to the player name.

### Center Bar
- Background: `#1a1610` (deeper than surface)
- Bordered by 1px wood rail lines top and bottom
- Leading player score: `#e8e0d6` (just brighter, no color)
- "End Round" button: neutral light-on-dark (`background: rgba(232,224,214,0.1); color: #e8e0d6; border: 1px solid #3d362e`)
- "Undo Round": clay-toned text with subtle clay border
- "Menu": dim text, no border

### Player Colors (Customizable)
- Default player disc colors: natural wood vs dark wood (for future use in player-specific theming)
- System built to support custom player color pairs
- Not in scope for initial implementation — note for future

## Non-Game Pages

### Shared Foundation
- Background: `#1f1b17` (same warm espresso)
- Max width: `max-w-md` centered (unchanged)
- All borders: warm brown (`#3d362e`) instead of neutral gray
- Text hierarchy uses `--text-primary`, `--text-secondary`, `--text-muted`, `--text-dim`

### Home Page
- "Crokinole" title: `--text-primary` (`#e8e0d6`)
- "New Game" CTA: birch-toned (`background: linear-gradient(135deg, var(--rail-2), var(--rail-3)); color: #1a1400`) — this is the one place outside the game view where birch appears as a filled element
- Secondary buttons (Players, Stats): neutral light-on-dark style
- Game cards (resume/recent): `--surface-raised` background with `--crk-border` border

### Stats Page
- Player selector buttons styled as small discs (round, dimensional) rather than generic pills
- Stat values in `--text-primary`
- Stat labels in `--text-muted`
- Earth tones for semantic accents: sage for positive stats (wins, win %), clay for negative. This requires adding a `variant` prop (e.g., `"positive" | "negative" | "neutral"`) to `StatCard` so the parent can control coloring per-stat.

### Game Setup Page (`/game/new`)
- Same warm espresso background and text hierarchy as other non-game pages
- Player/hammer pickers: warm brown borders, espresso surface
- "Start Game" CTA: birch-toned (same treatment as "New Game" on home)

### Players Page
- Same card styling as home page
- Add player input: warm brown border, espresso background
- Remove buttons: clay-toned (destructive)

### Dialogs (RoundSummary, GameOver, ExitMenu)
- Dialog overlay: unchanged (dark scrim)
- Dialog content background: `--surface-raised` (`#2a2520`)
- Dialog borders: `--crk-border` (`#3d362e`)
- Dialog text follows the standard text hierarchy
- Dialog buttons follow the same neutral style (light-on-dark) with birch-toned primary actions where appropriate

## Typography

No font changes. Inter stays. The warmth comes from color and material, not typeface.

## What's NOT Changing

- App structure and layout (flex column, split screen, max-w-md)
- Component architecture (PlayerHalf, CenterBar, RingButton, etc.)
- Touch targets and accessibility (48px minimums, ARIA labels, focus rings)
- Animation behavior (scale/brightness on press, transition durations)
- Dark mode enforcement
- Wake lock behavior
- Data flow and server actions

## Implementation Notes

- All new colors should be CSS custom properties in `globals.css` under `@theme inline`
- Ring button colors replace the existing `RING_COLORS` map in `ring-button.tsx`
- Wood rail is a new shared component or inline element in the game layout
- SVG icons for HAMMER/LEAD can be inline in `player-half.tsx` or extracted to a small icon component
- The birch rail gradient can be a Tailwind utility or CSS class since it's reused
- Real wood photo texture: deferred. CSS gradients are the starting point — if they feel too flat after implementation, a small tileable birch image can be added later as a background on the rail elements
