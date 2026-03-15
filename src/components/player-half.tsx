"use client";

import { MiniBoard } from "./mini-board";
import { TwentiesTray } from "./twenties-tray";
import { Button } from "@/components/ui/button";

interface DiscData {
  id: number;
  playerId: number;
  ringValue: number;
  posX: number | null;
  posY: number | null;
}

interface PlayerHalfProps {
  name: string;
  roundScore: number;
  discCount: number;
  hasHammer: boolean;
  isRotated: boolean;
  playerId: number;
  discs: DiscData[];
  opponentDiscs: DiscData[];
  isPlayer1: boolean;
  onPlace: (ringValue: number, posX: number, posY: number) => void;
  onRemove: (discId: number) => void;
  onUndo: () => void;
  disabled?: boolean;
}

function HammerIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <rect x="5" y="4" width="14" height="8" rx="2" fill="#b8a898" />
      <rect x="10" y="12" width="3.5" height="8" rx="1.5" fill="#8a8078" />
    </svg>
  );
}

export function PlayerHalf({
  name,
  roundScore,
  discCount,
  hasHammer,
  isRotated,
  playerId,
  discs,
  opponentDiscs,
  isPlayer1,
  onPlace,
  onRemove,
  onUndo,
  disabled,
}: PlayerHalfProps) {
  // Filter 20s for the tray
  const twenties = discs.filter(
    (d) => d.playerId === playerId && d.ringValue === 20,
  );

  return (
    <div
      className={`flex-1 relative ${isRotated ? "rotate-180" : ""}`}
      aria-label={`${name}'s scoring area`}
    >
      {/* Top-left: Name + Hammer */}
      <div className="absolute top-2 left-3 z-10">
        <div
          className="text-[10px] uppercase tracking-widest"
          style={{ color: "var(--text-dim, #8a8078)" }}
        >
          {name}
        </div>
        {hasHammer && (
          <div className="mt-0.5">
            <HammerIcon />
          </div>
        )}
      </div>

      {/* Top-right: Round score + disc count */}
      <div className="absolute top-2 right-3 z-10 text-right">
        <div
          className="text-2xl font-bold tabular-nums"
          style={{ color: "var(--foreground, #ddd8d0)", lineHeight: 1 }}
          aria-label={`Round score: ${roundScore}`}
          aria-live="polite"
        >
          +{roundScore}
        </div>
        <div
          className="text-[10px] mt-0.5"
          style={{ color: "var(--text-dim, #8a8078)" }}
        >
          {discCount} of 8
        </div>
      </div>

      {/* Center: MiniBoard */}
      <div className="absolute inset-0 flex items-center justify-center p-2">
        <MiniBoard
          discs={discs}
          playerId={playerId}
          opponentDiscs={opponentDiscs}
          onPlace={onPlace}
          onRemove={onRemove}
          disabled={disabled}
          maxDiscs={8}
          isPlayer1={isPlayer1}
        />
      </div>

      {/* Bottom-left: 20s tray */}
      <div className="absolute bottom-2 left-3 z-10">
        <TwentiesTray
          discs={twenties}
          onAdd={() => onPlace(20, 0, 0)}
          onRemove={onRemove}
          disabled={disabled}
          isPlayer1={isPlayer1}
        />
      </div>

      {/* Bottom-right: Undo */}
      <div className="absolute bottom-2 right-3 z-10">
        <Button
          onClick={onUndo}
          disabled={disabled || roundScore === 0}
          variant="outline"
          className="h-7 px-3 text-xs"
          aria-label={`Undo ${name}'s last disc`}
        >
          Undo
        </Button>
      </div>
    </div>
  );
}
