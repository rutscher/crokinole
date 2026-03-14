# Crokinole Scorekeeper — Design Spec

## Overview

A mobile-first web application for keeping score during crokinole games. Designed to sit beside the board during play, with a split-screen chess-clock-style interface where each player's half faces them. Tracks game scores, round-by-round results, and lifetime statistics.

## Format

Standard casual crokinole: difference-based scoring, first to 100 points wins. 1v1 only (doubles may be added later).

## Crokinole Rules (as implemented)

### Scoring
- Ring values: 20 (center hole), 15 (inner ring), 10 (middle ring), 5 (outer ring)
- Discs on a boundary line score the lower zone value (player judgment, not app-enforced)
- 20s are pocketed immediately during play; 15/10/5 discs remain on the board until round end

### Round Scoring
- After all discs are shot, each player's disc values are tallied
- The player with more points receives the **difference** as their round score (added to game total)
- Tied rounds award 0 points to both players

### Hammer
- Hammer = last shot advantage (the player who shoots last in a round)
- First hammer is chosen by the players at game start
- Hammer auto-alternates each round (player with hammer becomes first shooter next round)
- Players can manually override if needed

### Game End
- First player to reach 100 points wins
- No win-by-margin requirement

## Tech Stack

- **Next.js 14+** (App Router) — single deployable for frontend and backend
- **shadcn/ui + Tailwind CSS** — modern component library, dark theme for tabletop use
- **Prisma + SQLite** — lightweight database, no separate server
- **Server Actions** — every disc tap persists immediately to the database

## Architecture

Server-rendered with API calls. Each disc tap sends a server action to persist immediately. If the browser crashes mid-round, reload picks up where you left off. Local network latency is negligible.

No authentication — trusted local network deployment.

## Data Model

### Players
| Field | Type | Notes |
|-------|------|-------|
| id | Int (PK) | Auto-increment |
| name | String | Unique |
| createdAt | DateTime | |

### Games
| Field | Type | Notes |
|-------|------|-------|
| id | Int (PK) | Auto-increment |
| player1Id | Int (FK → Players) | |
| player2Id | Int (FK → Players) | |
| player1Score | Int | Running game total, default 0 |
| player2Score | Int | Running game total, default 0 |
| winnerId | Int? (FK → Players) | Null while in progress |
| status | Enum | in_progress, completed |
| firstHammerPlayerId | Int (FK → Players) | Who had hammer in round 1 |
| createdAt | DateTime | |

### Rounds
| Field | Type | Notes |
|-------|------|-------|
| id | Int (PK) | Auto-increment |
| gameId | Int (FK → Games) | |
| roundNumber | Int | 1-indexed |
| player1RoundScore | Int | Sum of player 1's disc values |
| player2RoundScore | Int | Sum of player 2's disc values |
| pointsAwarded | Int | Absolute difference |
| awardedToPlayerId | Int? (FK → Players) | Null if tied |
| hammerPlayerId | Int (FK → Players) | Who had hammer this round |
| createdAt | DateTime | |

### Discs
| Field | Type | Notes |
|-------|------|-------|
| id | Int (PK) | Auto-increment |
| roundId | Int (FK → Rounds) | |
| playerId | Int (FK → Players) | |
| ringValue | Int | 5, 10, 15, or 20 |
| createdAt | DateTime | |

## Screen Flow

### Home Screen
- **New Game** button (prominent, primary action)
- **Players** — manage the roster (add/edit/remove)
- **Stats** — lifetime stats viewer
- **Recent Games** — last 10 matches, most recent first, showing players, scores, and dates

### New Game Setup
- Pick Player 1 and Player 2 from the roster (or add new inline)
- Choose who gets first hammer
- Tap "Start Game"

### Active Game (Split Screen)
The phone lays flat on the table between both players. The screen is split in half:

- **Top half** — rotated 180 degrees, faces the far player
- **Bottom half** — normal orientation, faces the near player
- **Center bar** — shared controls, readable from both sides

Each player's half contains:
- Player name
- Game score (large, prominent)
- Ring tap buttons: 20 (gold), 15 (red), 10 (blue), 5 (green)
- Current round tally (sum of discs tapped this round)
- Hammer indicator (when they have it)

Center bar contains:
- Round number
- **End Round** button
- **Undo** button (removes last disc entry in the current round only; cannot undo across rounds)

### Round End Flow
1. Player taps "End Round"
2. App calculates difference between round tallies
3. Brief display showing: "Rob wins the round +15"
4. Game scores update
5. Hammer flips to the other player
6. Round tally resets for next round

### Game Over
- Triggered when a player's game score reaches 100+
- Winner celebration screen with final score
- Option to start a rematch (same players) or return home

### Stats Screen
- Player picker (select from roster)
- **Individual stats:** W/L record, win %, average margin, total 20s hit, average round score, highest single-round score, games played
- **Head-to-head:** pick an opponent to see record against them
- **Match history:** list of games with opponent, scores, and dates

## Lifetime Stats (Derived from Disc Data)

All stats are computed from the Discs and Rounds tables:

| Stat | Derivation |
|------|-----------|
| Win/Loss record | Count of Games where winnerId = playerId |
| Win % | Wins / total games |
| Head-to-head record | W/L filtered by opponent |
| Average margin | Average difference in final game scores (player score minus opponent score) across all completed games |
| Total 20s hit | Count of Discs where ringValue = 20 |
| Average round score | Avg of player's round scores across all rounds |
| Highest round score | Max of player's round scores |
| Games played | Count of completed Games involving player |

## UI Design Principles

- **Dark theme** — easier on eyes in casual/dim game settings
- **Large tap targets** — ring buttons are big, easy to hit mid-conversation
- **Minimal chrome** — scores and buttons dominate, no unnecessary UI
- **Color-coded rings** — 20 gold, 15 red, 10 blue, 5 green (consistent, learnable)
- **Mobile-first** — designed for phone screens laid flat, scales to desktop
- **Instant feedback** — tally updates immediately on tap, no loading states visible

## Deployment

- Single Next.js app deployed on the user's home server
- SQLite database file on the server filesystem
- Accessible via local network on any device's browser
