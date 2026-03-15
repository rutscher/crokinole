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
