# PWA Fullscreen — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the crokinole app installable as a PWA so it launches without browser chrome on mobile, plus show a dismissable hint prompting users to install it.

**Architecture:** Add a Next.js manifest.ts file, app icons, minimal service worker, and PWA meta tags. Add a client component that detects non-standalone mode and shows a one-time install hint with platform-specific instructions. The hint is dismissable and remembers dismissal in localStorage.

**Tech Stack:** Next.js App Router (manifest.ts convention), Service Worker API, localStorage

---

## Chunk 1: PWA Infrastructure

### Task 1: Create the web app manifest

**Files:**
- Create: `src/app/manifest.ts`

Next.js App Router has a built-in convention: a `manifest.ts` file in the app directory automatically generates `/manifest.json` and adds the `<link rel="manifest">` tag.

- [ ] **Step 1: Create the manifest file**

```ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Crokinole Scorekeeper",
    short_name: "Crokinole",
    description: "Keep score for your crokinole games",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#1f1b17",
    theme_color: "#1f1b17",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
```

Key choices:
- `display: "standalone"` — hides browser chrome, keeps OS status bar. Works on both Android and iOS.
- `background_color` and `theme_color` match the warm espresso surface (`#1f1b17`) so the splash screen and status bar blend with the app.
- `orientation: "portrait"` — crokinole scoring is portrait-only.
- Two icons: 192px maskable (for adaptive icon shapes) and 512px standard.

- [ ] **Step 2: Commit**

```bash
git add src/app/manifest.ts
git commit -m "feat: add PWA web app manifest"
```

### Task 2: Create app icons

**Files:**
- Create: `public/icon-192.png`
- Create: `public/icon-512.png`
- Create: `public/apple-touch-icon.png`

- [ ] **Step 1: Generate placeholder icons**

Create simple crokinole-themed icons. Use a solid `#1f1b17` background with a centered circle (representing the board/disc) in `#c4a87a` (rail color). The icons need to be:
- `icon-192.png` — 192x192px, safe zone for maskable (inner 80% is visible)
- `icon-512.png` — 512x512px
- `apple-touch-icon.png` — 180x180px (iOS home screen)

Use any image generation approach available (canvas script, ImageMagick, or manual creation). If no image tools are available, create minimal SVG-based placeholders by writing a small Node script:

```bash
node -e "
const { createCanvas } = require('canvas');
[192, 512, 180].forEach(size => {
  // If canvas module not available, just create 1x1 PNGs as placeholders
  console.log('Create ' + size + 'x' + size + ' icon manually or with a design tool');
});
"
```

If programmatic icon generation isn't possible, create a simple HTML file that renders the icons and screenshot them, or note them as TODO for the user to supply. The PWA will still be installable with placeholder icons.

**Minimum viable approach:** Copy any existing favicon or create solid-color PNGs. The icons can be refined later — installability only requires they exist and are the right size.

- [ ] **Step 2: Commit**

```bash
git add public/icon-192.png public/icon-512.png public/apple-touch-icon.png
git commit -m "feat: add PWA app icons"
```

### Task 3: Add PWA meta tags to layout

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Update the metadata and viewport exports**

Add PWA-related fields to the existing `metadata` export, and add `themeColor` to the existing `viewport` export (Next.js 14+ requires themeColor in viewport, not metadata):

```ts
export const metadata: Metadata = {
  title: "Crokinole Scorekeeper",
  description: "Keep score for your crokinole games",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Crokinole",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#1f1b17",
};
```

This adds:
- `<meta name="apple-mobile-web-app-capable" content="yes">` — iOS standalone mode
- `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">` — transparent status bar on iOS
- `<meta name="apple-mobile-web-app-title" content="Crokinole">` — home screen name on iOS
- `<link rel="apple-touch-icon" href="/apple-touch-icon.png">` — iOS home screen icon
- `<meta name="theme-color" content="#1f1b17">` — browser chrome color

Note: The `<link rel="manifest">` tag is auto-generated by the manifest.ts convention.

- [ ] **Step 2: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: add PWA meta tags for iOS and theme color"
```

### Task 4: Create and register a minimal service worker

**Files:**
- Create: `public/sw.js`
- Create: `src/components/service-worker-register.tsx`
- Modify: `src/app/layout.tsx`

Chrome requires a registered service worker for the app to be installable. The service worker doesn't need to do much — just exist and handle fetch events.

- [ ] **Step 1: Create the service worker**

Create `public/sw.js`:

```js
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
```

This is the absolute minimum service worker. It installs immediately and claims clients. No fetch handler is needed — Chrome 89+ no longer requires one for installability. All requests pass through to the network normally. Offline support can be added later if wanted.

- [ ] **Step 2: Create the registration component**

Create `src/components/service-worker-register.tsx`:

```tsx
"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return null;
}
```

- [ ] **Step 3: Add the registration component to the layout**

In `src/app/layout.tsx`, import and render it inside `<body>`:

```tsx
import { ServiceWorkerRegister } from "@/components/service-worker-register";

// In the return:
<body className={`${inter.className} antialiased`}>
  {children}
  <ServiceWorkerRegister />
</body>
```

- [ ] **Step 4: Verify installability**

Run: `npm run dev`

Open Chrome DevTools → Application tab → Manifest section. Verify:
- Manifest loads with correct fields
- Icons resolve
- "Installability" section shows no errors

Check Application → Service Workers: should show `sw.js` registered.

- [ ] **Step 5: Commit**

```bash
git add public/sw.js src/components/service-worker-register.tsx src/app/layout.tsx
git commit -m "feat: add service worker for PWA installability"
```

---

## Chunk 2: Install Hint Banner

### Task 5: Create the install hint component

**Files:**
- Create: `src/components/install-hint.tsx`

A small, dismissable banner that appears on the home page when the app is NOT running in standalone mode (i.e., the user hasn't installed it yet). It shows platform-specific instructions and remembers dismissal via localStorage.

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useState, useEffect } from "react";

function isStandalone() {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

export function InstallHint() {
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem("install-hint-dismissed")) return;

    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) {
      setPlatform("ios");
    } else if (/Android/.test(ua)) {
      setPlatform("android");
    }
    setShow(true);
  }, []);

  function dismiss() {
    setShow(false);
    localStorage.setItem("install-hint-dismissed", "1");
  }

  if (!show) return null;

  return (
    <div
      className="rounded-lg p-3 text-sm flex items-start gap-3"
      style={{ background: "var(--surface-deep)", border: "1px solid #3d362e" }}
    >
      <div className="flex-1">
        <p className="text-muted-foreground">
          {platform === "ios" ? (
            <>
              Tap{" "}
              <svg className="inline w-4 h-4 -mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>{" "}
              then <strong>&quot;Add to Home Screen&quot;</strong> for the best experience.
            </>
          ) : platform === "android" ? (
            <>
              Tap <strong>⋮</strong> then <strong>&quot;Add to Home Screen&quot;</strong> for the best experience.
            </>
          ) : (
            <>
              Install this app to your home screen for the best experience.
            </>
          )}
        </p>
      </div>
      <button
        onClick={dismiss}
        className="text-muted-foreground hover:text-foreground shrink-0 p-1 -m-1"
        aria-label="Dismiss"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
```

Key design decisions:
- Uses `var(--surface-deep)` and `#3d362e` border to match the warm palette
- `text-muted-foreground` so it's informative but not loud
- iOS gets the share icon inline; Android gets the three-dot menu reference
- Persists dismissal in localStorage with key `install-hint-dismissed`
- Checks `(display-mode: standalone)` and `navigator.standalone` to auto-hide when already installed
- Returns null during SSR (isStandalone returns true on server to avoid flash)

- [ ] **Step 2: Commit**

```bash
git add src/components/install-hint.tsx
git commit -m "feat: add dismissable PWA install hint component"
```

### Task 6: Add the install hint to the home page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Import and render the InstallHint**

Add the import at the top:
```tsx
import { InstallHint } from "@/components/install-hint";
```

Add the component just below the title section, before the buttons:

```tsx
<div className="text-center py-8">
  <h1 className="text-4xl font-bold mb-2">Crokinole</h1>
  <p className="text-muted-foreground">Scorekeeper</p>
</div>

<InstallHint />

<div className="space-y-3 mb-8">
```

- [ ] **Step 2: Verify on mobile**

Open on a mobile device (or Chrome DevTools mobile emulation). The hint should appear with platform-specific instructions. Dismissing it should hide it permanently. When the app is launched from the home screen (standalone mode), the hint should not appear.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: show install hint on home page for non-standalone users"
```
