"use client";

import { RingButton } from "./ring-button";
import { Button } from "@/components/ui/button";

interface PlayerHalfProps {
  name: string;
  gameScore: number;
  roundScore: number;
  hasHammer: boolean;
  isLeading: boolean;
  isRotated: boolean;
  onDiscTap: (ringValue: number) => void;
  onUndo: () => void;
  disabled?: boolean;
}

export function PlayerHalf({
  name,
  gameScore,
  roundScore,
  hasHammer,
  isLeading,
  isRotated,
  onDiscTap,
  onUndo,
  disabled,
}: PlayerHalfProps) {
  const ringValues = isRotated ? [5, 10, 15, 20] : [20, 15, 10, 5];

  return (
    <div
      className={`
        flex-1 flex flex-col items-center justify-center p-3 gap-1
        ${isRotated ? "rotate-180" : ""}
      `}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm uppercase tracking-widest text-muted-foreground">
          {name}
        </span>
        {hasHammer && (
          <span className="text-xs font-bold bg-amber-500 text-black px-2 py-0.5 rounded-full">
            HAMMER
          </span>
        )}
        {isLeading && (
          <span className="text-xs font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full">
            LEAD
          </span>
        )}
      </div>

      <div className={`text-5xl font-bold tabular-nums ${isLeading ? "text-emerald-400" : ""}`}>
        {gameScore}
      </div>

      <div className="text-3xl font-semibold text-primary tabular-nums">
        +{roundScore}
      </div>

      <div className="flex gap-4 mt-1">
        {ringValues.map((value) => (
          <RingButton
            key={value}
            value={value}
            onTap={() => onDiscTap(value)}
            disabled={disabled}
          />
        ))}
      </div>

      <Button
        onClick={onUndo}
        disabled={disabled || roundScore === 0}
        variant="outline"
        size="sm"
        className="mt-1"
      >
        Undo
      </Button>
    </div>
  );
}
