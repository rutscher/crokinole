"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { getRingValue, findDiscAtPosition } from "@/lib/board-utils";

interface DiscData {
  id: number;
  playerId: number;
  ringValue: number;
  posX: number | null;
  posY: number | null;
}

interface MiniBoardProps {
  discs: DiscData[];
  playerId: number;
  opponentDiscs: DiscData[];
  onPlace: (ringValue: number, posX: number, posY: number) => void;
  onRemove: (discId: number) => void;
  disabled?: boolean;
  maxDiscs?: number;
  isPlayer1?: boolean;
  onDoubleTap?: () => void;
}

// Ring visual boundaries — match board-utils thresholds
const RINGS = [
  { r: 1.0, fill: "#2a3530", stroke: "#4a6050", label: "5" },
  { r: 0.69, fill: "#283038", stroke: "#4a6050", label: "10" },
  { r: 0.39, fill: "#3a2820", stroke: "#4a6050", label: "15" },
  { r: 0.08, fill: "#1a1400", stroke: "#4a3a20", label: "20" },
];

const LIGHT_DISC = {
  fill: "url(#lightDisc)",
  stroke: "#a09888",
};
const DARK_DISC = {
  fill: "url(#darkDisc)",
  stroke: "#6a6460",
};

const DISC_RADIUS = 0.065;

export function MiniBoard({
  discs,
  playerId,
  opponentDiscs,
  onPlace,
  onRemove,
  disabled = false,
  maxDiscs = 8,
  isPlayer1 = false,
  onDoubleTap,
}: MiniBoardProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [flashingDiscId, setFlashingDiscId] = useState<number | null>(null);
  const [flashValue, setFlashValue] = useState<number | null>(null);
  const prevOwnCountRef = useRef(0);
  const lastTapTimeRef = useRef(0);
  const lastPlacedDiscRef = useRef<{ ringValue: number; posX: number; posY: number } | null>(null);

  // Flash the newest disc when own disc count increases
  const ownDiscs = discs.filter((d) => d.playerId === playerId);
  useEffect(() => {
    if (ownDiscs.length > prevOwnCountRef.current && ownDiscs.length > 0) {
      const newest = ownDiscs[ownDiscs.length - 1];
      setFlashingDiscId(newest.id);
      setFlashValue(newest.ringValue);
    }
    prevOwnCountRef.current = ownDiscs.length;
  }, [ownDiscs]);

  // Clear flash after 1.5s
  useEffect(() => {
    if (flashingDiscId == null) return;
    const timer = setTimeout(() => {
      setFlashingDiscId(null);
      setFlashValue(null);
    }, 1500);
    return () => clearTimeout(timer);
  }, [flashingDiscId]);

  const atLimit = ownDiscs.length >= maxDiscs;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();

      const now = Date.now();
      const timeSinceLastTap = now - lastTapTimeRef.current;
      lastTapTimeRef.current = now;

      // Double-tap detection (< 300ms between taps)
      if (timeSinceLastTap < 300 && onDoubleTap) {
        // Undo the disc that was placed by the first tap
        if (lastPlacedDiscRef.current) {
          // Find and remove the most recently placed own disc
          const latest = ownDiscs[ownDiscs.length - 1];
          if (latest) onRemove(latest.id);
          lastPlacedDiscRef.current = null;
        }
        onDoubleTap();
        lastTapTimeRef.current = 0;
        return;
      }

      lastPlacedDiscRef.current = null;

      const svg = svgRef.current;
      if (!svg) return;

      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const svgPt = pt.matrixTransform(svg.getScreenCTM()!.inverse());
      const posX = svgPt.x;
      const posY = svgPt.y;

      // Skip hit-testing in the 20 zone
      const tapRadius = Math.sqrt(posX * posX + posY * posY);
      const inHoleZone = tapRadius < 0.08;

      const hitDisc = !inHoleZone ? findDiscAtPosition(discs, posX, posY, playerId) : null;
      if (hitDisc) {
        setFlashingDiscId(hitDisc.id);
        setFlashValue(hitDisc.ringValue);
        setTimeout(() => {
          onRemove(hitDisc.id);
          setFlashingDiscId(null);
          setFlashValue(null);
        }, 300);
        return;
      }

      if (atLimit) return;
      const ringValue = getRingValue(posX, posY);
      if (ringValue == null) return;

      // Track this placement so double-tap can undo it
      lastPlacedDiscRef.current = { ringValue, posX, posY };
      onPlace(ringValue, posX, posY);
    },
    [disabled, discs, ownDiscs, playerId, onPlace, onRemove, onDoubleTap, atLimit],
  );

  // Determine disc colors based on player
  const ownStyle = isPlayer1 ? LIGHT_DISC : DARK_DISC;
  const opponentStyle = isPlayer1 ? DARK_DISC : LIGHT_DISC;

  return (
    <svg
      ref={svgRef}
      viewBox="-1.05 -1.05 2.1 2.1"
      className="w-full h-full"
      style={{ touchAction: "none" }}
      onPointerDown={handlePointerDown}
      aria-label="Crokinole scoring board"
    >
      <defs>
        <radialGradient id="lightDisc" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#e8dcc8" />
          <stop offset="100%" stopColor="#c8b898" />
        </radialGradient>
        <radialGradient id="darkDisc" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#4a4440" />
          <stop offset="100%" stopColor="#2a2420" />
        </radialGradient>
      </defs>

      {/* Board background */}
      <circle cx={0} cy={0} r={1.02} fill="#1e2520" />

      {/* Rings (outer to inner) */}
      {RINGS.map((ring) => (
        <circle
          key={ring.label}
          cx={0}
          cy={0}
          r={ring.r}
          fill={ring.fill}
          stroke={ring.stroke}
          strokeWidth={0.02}
        />
      ))}

      {/* Center hole shadow */}
      <circle cx={0} cy={0} r={0.07} fill="#0a0800" opacity={0.6} />

      {/* Ring labels (subtle) — centered in each ring band */}
      <text x={0} y={0.87} textAnchor="middle" fill="rgba(221,216,208,0.3)" fontSize={0.08} fontWeight="bold">5</text>
      <text x={0} y={0.57} textAnchor="middle" fill="rgba(221,216,208,0.3)" fontSize={0.08} fontWeight="bold">10</text>
      <text x={0} y={0.27} textAnchor="middle" fill="rgba(221,216,208,0.3)" fontSize={0.08} fontWeight="bold">15</text>
      <text x={0} y={0.03} textAnchor="middle" fill="rgba(200,168,98,0.5)" fontSize={0.06} fontWeight="bold">20</text>

      {/* Opponent discs (positions negated for 180° rotation) */}
      {opponentDiscs.map((disc) =>
        disc.posX != null && disc.posY != null ? (
          <circle
            key={`opp-${disc.id}`}
            cx={-disc.posX}
            cy={-disc.posY}
            r={DISC_RADIUS}
            fill={opponentStyle.fill}
            stroke={opponentStyle.stroke}
            strokeWidth={0.012}
            style={{ filter: "drop-shadow(0 0.01px 0.03px rgba(0,0,0,0.5))" }}
          />
        ) : null,
      )}

      {/* Own discs */}
      {discs
        .filter((d) => d.playerId === playerId)
        .map((disc) =>
          disc.posX != null && disc.posY != null ? (
            <g key={`own-${disc.id}`}>
              <circle
                cx={disc.posX}
                cy={disc.posY}
                r={DISC_RADIUS}
                fill={ownStyle.fill}
                stroke={ownStyle.stroke}
                strokeWidth={0.012}
                style={{ filter: "drop-shadow(0 0.01px 0.03px rgba(0,0,0,0.5))" }}
              />
              {/* Value flash */}
              {flashingDiscId === disc.id && flashValue != null && (
                <text
                  x={disc.posX}
                  y={disc.posY + 0.025}
                  textAnchor="middle"
                  fill={isPlayer1 ? "#1a1400" : "#ddd8d0"}
                  fontSize={0.06}
                  fontWeight="bold"
                  style={{ pointerEvents: "none" }}
                >
                  {flashValue}
                </text>
              )}
            </g>
          ) : null,
        )}
    </svg>
  );
}
