"use client";

import { MiniBoard } from "./mini-board";
import { TwentiesTray } from "./twenties-tray";

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
  onToggleLock: () => void;
  isLocked: boolean;
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
  onToggleLock,
  isLocked,
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
          className="text-xs uppercase tracking-widest"
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
          className="text-3xl font-bold tabular-nums"
          style={{ color: "var(--foreground, #ddd8d0)", lineHeight: 1 }}
          aria-label={`Round score: ${roundScore}`}
          aria-live="polite"
        >
          +{roundScore}
        </div>
        <div
          className="text-xs mt-0.5"
          style={{ color: "var(--text-dim, #8a8078)" }}
        >
          {discCount} of 8
        </div>
      </div>

      {/* Center: MiniBoard */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden p-1">
        <MiniBoard
          discs={discs}
          playerId={playerId}
          opponentDiscs={opponentDiscs}
          onPlace={onPlace}
          onRemove={onRemove}
          onDoubleTap={onToggleLock}
          disabled={isLocked || disabled}
          maxDiscs={8}
          isPlayer1={isPlayer1}
        />
      </div>

      {/* Lock overlay — tap to unlock */}
      {isLocked && (
        <div
          className="absolute inset-0 flex items-center justify-center z-20 cursor-pointer"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={onToggleLock}
        >
          <div className="flex flex-col items-center gap-1">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(90,117,96,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span style={{ fontSize: 9, color: "rgba(90,117,96,0.7)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>
              Locked In
            </span>
            <span style={{ fontSize: 7, color: "rgba(90,117,96,0.5)", marginTop: 2 }}>
              tap to unlock
            </span>
          </div>
        </div>
      )}

      {/* Bottom-left: 20s tray */}
      <div className="absolute bottom-2 left-3 z-10">
        <TwentiesTray
          discs={twenties}
          onAdd={() => onPlace(20, 0, 0)}
          onRemove={onRemove}
          disabled={isLocked || disabled}
          isPlayer1={isPlayer1}
        />
      </div>

      {/* Bottom-right: Double-tap hint */}
      {!isLocked && (
        <div className="absolute bottom-2 right-3 z-10">
          <span style={{ fontSize: 10, color: "#5a524a" }}>
            double-tap to lock
          </span>
        </div>
      )}
    </div>
  );
}
