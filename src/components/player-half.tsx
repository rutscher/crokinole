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
        flex-1 flex flex-col items-center justify-center p-4 gap-2
        ${isRotated ? "rotate-180" : ""}
      `}
    >
      <div className="text-xs uppercase tracking-widest text-muted-foreground">
        {name}
      </div>
      <div className="text-5xl font-bold">{gameScore}</div>
      <div className="text-sm text-muted-foreground">
        {hasHammer ? "Hammer" : "\u00A0"}
      </div>
      <div className="flex gap-3 mt-2">
        {ringValues.map((value) => (
          <RingButton
            key={value}
            value={value}
            onClick={() => onDiscTap(value)}
            disabled={disabled}
          />
        ))}
      </div>
      <div className="text-sm text-muted-foreground mt-1">
        Round: {roundScore}
      </div>
    </div>
  );
}
