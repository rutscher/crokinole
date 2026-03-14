"use client";

import { Button } from "@/components/ui/button";

interface CenterBarProps {
  roundNumber: number;
  onEndRound: () => void;
  onUndo: () => void;
  onUndoRound: () => void;
  canUndoRound: boolean;
  disabled?: boolean;
}

export function CenterBar({
  roundNumber,
  onEndRound,
  onUndo,
  onUndoRound,
  canUndoRound,
  disabled,
}: CenterBarProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-y border-border gap-2">
      <div className="flex gap-2">
        <Button onClick={onUndo} disabled={disabled} variant="outline" size="sm">
          Undo
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

      <Button onClick={onEndRound} disabled={disabled} size="sm" className="px-6">
        End Round
      </Button>

      <span className="text-sm font-medium text-muted-foreground min-w-[2rem] text-right">
        R{roundNumber}
      </span>
    </div>
  );
}
