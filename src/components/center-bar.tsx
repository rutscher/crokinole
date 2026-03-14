"use client";

import { Button } from "@/components/ui/button";

interface CenterBarProps {
  roundNumber: number;
  onEndRound: () => void;
  onUndo: () => void;
  disabled?: boolean;
}

export function CenterBar({ roundNumber, onEndRound, onUndo, disabled }: CenterBarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-y border-border">
      <button
        onClick={onUndo}
        disabled={disabled}
        className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
      >
        Undo
      </button>
      <Button
        onClick={onEndRound}
        disabled={disabled}
        size="sm"
        className="px-6"
      >
        End Round
      </Button>
      <span className="text-xs text-muted-foreground">R{roundNumber}</span>
    </div>
  );
}
