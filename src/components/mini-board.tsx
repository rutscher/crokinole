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
}

// Ring visual boundaries (normalized radius)
const RINGS = [
  { r: 1.0, fill: "#2a3530", stroke: "#4a6050", label: "5" },
  { r: 0.75, fill: "#283038", stroke: "#4a6050", label: "10" },
  { r: 0.50, fill: "#3a2820", stroke: "#4a6050", label: "15" },
  { r: 0.25, fill: "#1a1400", stroke: "#4a3a20", label: "20" },
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
}: MiniBoardProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [flashingDiscId, setFlashingDiscId] = useState<number | null>(null);
  const [flashValue, setFlashValue] = useState<number | null>(null);

  // Clear flash after 1.5s
  useEffect(() => {
    if (flashingDiscId == null) return;
    const timer = setTimeout(() => {
      setFlashingDiscId(null);
      setFlashValue(null);
    }, 1500);
    return () => clearTimeout(timer);
  }, [flashingDiscId]);

  const ownDiscCount = discs.filter((d) => d.playerId === playerId).length;
  const atLimit = ownDiscCount >= maxDiscs;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();

      const svg = svgRef.current;
      if (!svg) return;

      // Convert screen coords to SVG coords
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const svgPt = pt.matrixTransform(svg.getScreenCTM()!.inverse());
      const posX = svgPt.x;
      const posY = svgPt.y;

      // Hit-test own discs only (tap-to-remove)
      const hitDisc = findDiscAtPosition(discs, posX, posY, playerId);
      if (hitDisc) {
        // Flash the value briefly before removing
        setFlashingDiscId(hitDisc.id);
        setFlashValue(hitDisc.ringValue);
        setTimeout(() => {
          onRemove(hitDisc.id);
          setFlashingDiscId(null);
          setFlashValue(null);
        }, 300);
        return;
      }

      // Placement — check if within board and not at limit
      if (atLimit) return;
      const ringValue = getRingValue(posX, posY);
      if (ringValue == null) return;

      // Flash value on newly placed disc
      const tempId = Date.now(); // will be replaced by actual ID
      setFlashingDiscId(tempId);
      setFlashValue(ringValue);

      onPlace(ringValue, posX, posY);
    },
    [disabled, discs, playerId, onPlace, onRemove, atLimit],
  );

  // Determine disc colors based on player
  const ownStyle = isPlayer1 ? LIGHT_DISC : DARK_DISC;
  const opponentStyle = isPlayer1 ? DARK_DISC : LIGHT_DISC;

  return (
    <svg
      ref={svgRef}
      viewBox="-1.05 -1.05 2.1 2.1"
      className="w-full h-full max-w-[260px] max-h-[260px]"
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
      <circle cx={0} cy={0} r={0.23} fill="#0a0800" opacity={0.6} />

      {/* Ring labels (subtle) */}
      <text x={0} y={0.92} textAnchor="middle" fill="rgba(221,216,208,0.3)" fontSize={0.08} fontWeight="bold">5</text>
      <text x={0} y={0.67} textAnchor="middle" fill="rgba(221,216,208,0.3)" fontSize={0.08} fontWeight="bold">10</text>
      <text x={0} y={0.42} textAnchor="middle" fill="rgba(221,216,208,0.3)" fontSize={0.08} fontWeight="bold">15</text>
      <text x={0} y={0.05} textAnchor="middle" fill="rgba(200,168,98,0.5)" fontSize={0.08} fontWeight="bold">20</text>

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
