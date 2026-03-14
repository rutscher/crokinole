"use client";

import { RingButton } from "./ring-button";

interface PlayerHalfProps {
  name: string;
  gameScore: number;
  roundScore: number;
  hasHammer: boolean;
  isRotated: boolean;
  onDiscTap: (ringValue: number) => void;
  disabled?: boolean;
}

export function PlayerHalf({
  name,
  gameScore,
  roundScore,
  hasHammer,
  isRotated,
  onDiscTap,
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
      </div>

      <div className="text-4xl font-bold">{gameScore}</div>

      <div className="text-3xl font-semibold text-primary tabular-nums">
        +{roundScore}
      </div>

      <div className="flex gap-4 mt-1">
        {ringValues.map((value) => (
          <RingButton
            key={value}
            value={value}
            onClick={() => onDiscTap(value)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}
