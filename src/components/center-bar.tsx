"use client";

import { Button } from "@/components/ui/button";

interface CenterBarProps {
  roundNumber: number;
  player1Name: string;
  player2Name: string;
  player1Total: number;
  player2Total: number;
  onEndRound: () => void;
  onUndoRound: () => void;
  onMenuOpen: () => void;
  canUndoRound: boolean;
  disabled?: boolean;
}

export function CenterBar({
  roundNumber,
  player1Name,
  player2Name,
  player1Total,
  player2Total,
  onEndRound,
  onUndoRound,
  onMenuOpen,
  canUndoRound,
  disabled,
}: CenterBarProps) {
  const diff = Math.abs(player1Total - player2Total);
  const leaderName = player1Total > player2Total
    ? player1Name
    : player2Total > player1Total
      ? player2Name
      : null;

  return (
    <div className="bg-muted/50 border-y border-border px-3 py-2 space-y-2">
      {/* Score comparison */}
      <div className="flex items-center justify-center gap-3 text-sm" aria-live="polite">
        <span className={`font-bold tabular-nums ${player1Total >= player2Total ? "text-emerald-400" : "text-muted-foreground"}`}>
          {player1Total}
        </span>
        <span className="text-muted-foreground">
          {leaderName ? `${leaderName} +${diff}` : "Tied"}
        </span>
        <span className={`font-bold tabular-nums ${player2Total >= player1Total ? "text-emerald-400" : "text-muted-foreground"}`}>
          {player2Total}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button
            onClick={onMenuOpen}
            variant="ghost"
            size="sm"
            aria-label="Game menu"
            className="px-2"
          >
            Menu
          </Button>
          {canUndoRound && (
            <Button
              onClick={onUndoRound}
              disabled={disabled}
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/50"
            >
              Undo Round
            </Button>
          )}
        </div>

        <Button
          onClick={onEndRound}
          disabled={disabled}
          className="px-8 min-h-[48px] text-base font-bold"
          aria-label="End the current round"
        >
          End Round
        </Button>

        <span className="text-sm font-medium text-muted-foreground min-w-[2rem] text-right">
          R{roundNumber}
        </span>
      </div>
    </div>
  );
}
