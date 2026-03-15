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
              Tap <strong>&#8942;</strong> then <strong>&quot;Add to Home Screen&quot;</strong> for the best experience.
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
