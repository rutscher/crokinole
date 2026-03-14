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
      <div className="flex items-center justify-center gap-3 text-sm">
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

      <div className="flex items-center justify-between gap-2">
        {canUndoRound ? (
          <Button
            onClick={onUndoRound}
            disabled={disabled}
            variant="outline"
            size="sm"
            className="text-destructive border-destructive/50"
          >
            Undo Round
          </Button>
        ) : (
          <span className="text-sm font-medium text-muted-foreground">
            R{roundNumber}
          </span>
        )}

        <Button
          onClick={onEndRound}
          disabled={disabled}
          className="px-8 h-10 text-base font-bold"
        >
          End Round
        </Button>

        {canUndoRound ? (
          <span className="text-sm font-medium text-muted-foreground min-w-[2rem] text-right">
            R{roundNumber}
          </span>
        ) : (
          <span className="min-w-[2rem]" />
        )}
      </div>
    </div>
  );
}
