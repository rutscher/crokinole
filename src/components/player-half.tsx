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

function HammerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="5" y="4" width="14" height="8" rx="2" fill="#b8a898" />
      <rect x="10" y="12" width="3.5" height="8" rx="1.5" fill="#8a8078" />
    </svg>
  );
}

function LeadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M7 15l5-7 5 7" stroke="#ddd8d0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DiscBadge({
  variant,
  children,
  label,
}: {
  variant: "hammer" | "lead";
  children: React.ReactNode;
  label: string;
}) {
  const styles =
    variant === "hammer"
      ? {
          background: "radial-gradient(circle at 40% 35%, #3a3430, #292420 60%, #1f1c19)",
          boxShadow: "0 2px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
        }
      : {
          background: "radial-gradient(circle at 40% 35%, #5a7560, #486050 60%, #3a5040)",
          boxShadow: "0 2px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
        };

  return (
    <div
      className="w-[34px] h-[34px] rounded-full flex items-center justify-center"
      style={styles}
      role="status"
      aria-label={label}
    >
      {children}
    </div>
  );
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
          <DiscBadge variant="hammer" label="Has hammer">
            <HammerIcon />
          </DiscBadge>
        )}
        {isLeading && (
          <DiscBadge variant="lead" label="Leading">
            <LeadIcon />
          </DiscBadge>
        )}
      </div>

      {/* Game Score */}
      <div
        className="text-5xl font-bold tabular-nums"
        style={isLeading ? { color: "var(--lead)" } : undefined}
        aria-label={`Game score: ${gameScore}`}
        role="status"
      >
        {gameScore}
      </div>

      {/* Round Score */}
      <div
        className="text-3xl font-semibold tabular-nums"
        style={{ color: "var(--text-secondary)" }}
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
