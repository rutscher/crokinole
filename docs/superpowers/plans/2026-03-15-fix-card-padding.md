# Fix Card Padding Consistency

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate double-stacked vertical padding on cards by removing padding overrides from CardContent and the py-0 hack from Card.

**Architecture:** The Card component provides `py-4` (16px vertical) and CardContent provides `px-4` (16px horizontal). Every usage in the app incorrectly adds `p-3`, `p-4`, or `p-6` to CardContent — double-stacking vertical padding with the Card. The home page then hacks `py-0` onto Card to counteract this, creating cramped cards. Fix: remove all CardContent padding overrides on list items and let the component defaults work as designed.

**Tech Stack:** Next.js, React, Tailwind CSS, shadcn/ui Card

---

## Chunk 1: Fix all CardContent padding overrides

### Task 1: Fix home page game cards

**Files:**
- Modify: `src/app/page.tsx:85,86,109,110`

- [ ] **Step 1: Remove py-0 from Card and p-3 from CardContent on resume game cards**

```tsx
// Line 85: Change from:
<Card className="cursor-pointer hover:bg-muted/50 transition-colors py-0">
  <CardContent className="p-3">

// To:
<Card className="cursor-pointer hover:bg-muted/50 transition-colors">
  <CardContent>
```

- [ ] **Step 2: Same fix for recent game cards**

```tsx
// Line 109: Change from:
<Card className="cursor-pointer hover:bg-muted/50 transition-colors py-0">
  <CardContent className="p-3">

// To:
<Card className="cursor-pointer hover:bg-muted/50 transition-colors">
  <CardContent>
```

- [ ] **Step 3: Verify dev server renders correctly**

Run: `npm run dev` and check http://localhost:3000 — cards should have consistent 16px vertical + 16px horizontal padding.

### Task 2: Fix stats page cards

**Files:**
- Modify: `src/app/stats/page.tsx:51,134`

- [ ] **Step 1: Remove p-4 from player selector CardContent**

```tsx
// Line 51: Change from:
<CardContent className="p-4">

// To:
<CardContent>
```

- [ ] **Step 2: Remove p-4 from match history CardContent**

```tsx
// Line 134: Change from:
<CardContent className="p-4">

// To:
<CardContent>
```

### Task 3: Fix players page cards

**Files:**
- Modify: `src/app/players/page.tsx:49`

- [ ] **Step 1: Remove p-4 from player list CardContent, keep flex classes**

```tsx
// Line 49: Change from:
<CardContent className="flex items-center justify-between p-4">

// To:
<CardContent className="flex items-center justify-between">
```

### Task 4: Fix game detail page cards

**Files:**
- Modify: `src/app/game/[id]/game-detail.tsx:37,71`

- [ ] **Step 1: Remove p-6 from final score CardContent, keep text-center**

```tsx
// Line 37: Change from:
<CardContent className="p-6 text-center">

// To:
<CardContent className="text-center">
```

- [ ] **Step 2: Remove p-3 from round summary CardContent**

```tsx
// Line 71: Change from:
<CardContent className="p-3">

// To:
<CardContent>
```

### Task 5: Verify and commit

- [ ] **Step 1: Run tests**

Run: `npm test`
Expected: All 25 tests pass (these are data-layer tests, not UI tests, so no failures expected).

- [ ] **Step 2: Visually verify all pages**

Check these routes on dev server:
- `/` — home page game lists have consistent card padding
- `/players` — player list cards match
- `/stats` — player selector and match history cards match
- `/game/[id]` — final score and round cards match

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx src/app/stats/page.tsx src/app/players/page.tsx src/app/game/[id]/game-detail.tsx
git commit -m "fix: remove double-stacked card padding across all pages

Let Card's built-in py-4 handle vertical padding and CardContent's
default px-4 handle horizontal. Removes py-0 hack on home page and
p-3/p-4/p-6 overrides from CardContent everywhere."
```
