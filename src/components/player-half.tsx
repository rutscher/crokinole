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
      aria-label={`${name}'s scoring area`}
    >
      {/* Name + badges */}
      <div className="flex items-center gap-2">
        <span className="text-sm uppercase tracking-widest text-muted-foreground">
          {name}
        </span>
        {hasHammer && (
          <span className="text-xs font-bold bg-amber-500 text-black px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(217,119,6,0.5)]" role="status">
            HAMMER
          </span>
        )}
        {isLeading && (
          <span className="text-xs font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full" role="status">
            LEAD
          </span>
        )}
      </div>

      {/* Game Score */}
      <div
        className={`text-5xl font-bold tabular-nums ${isLeading ? "text-emerald-400" : ""}`}
        aria-label={`Game score: ${gameScore}`}
        role="status"
      >
        {gameScore}
      </div>

      {/* Round Score */}
      <div
        className="text-3xl font-semibold text-primary tabular-nums"
        aria-label={`Round score: ${roundScore}`}
        aria-live="polite"
      >
        +{roundScore}
      </div>

      {/* Ring Buttons */}
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

      {/* Undo — 48px minimum */}
      <Button
        onClick={onUndo}
        disabled={disabled || roundScore === 0}
        variant="outline"
        className="mt-2 min-h-[48px] px-6"
        aria-label={`Undo ${name}'s last disc`}
      >
        Undo
      </Button>
    </div>
  );
}
