// Boundary line scores the LOWER ring value per spec.
// Use strict less-than for inner boundaries; outer boundary (1.0) is inclusive.
// Hole is disc-sized (~0.08 radius). Remaining space split evenly among 3 rings.
// 0–0.08 = 20 (hole), 0.08–0.39 = 15, 0.39–0.69 = 10, 0.69–1.0 = 5
const RING_THRESHOLDS = [
  { maxRadius: 0.08, value: 20, exclusive: true },
  { maxRadius: 0.39, value: 15, exclusive: true },
  { maxRadius: 0.69, value: 10, exclusive: true },
  { maxRadius: 1.00, value: 5, exclusive: false },
] as const;

const HIT_RADIUS = 0.08;

export function getRingValue(posX: number, posY: number): number | null {
  const radius = Math.sqrt(posX * posX + posY * posY);
  for (const ring of RING_THRESHOLDS) {
    if (ring.exclusive ? radius < ring.maxRadius : radius <= ring.maxRadius) {
      return ring.value;
    }
  }
  return null;
}

interface DiscPosition {
  id: number;
  playerId: number;
  ringValue: number;
  posX: number | null;
  posY: number | null;
}

export function findDiscAtPosition(
  discs: DiscPosition[],
  tapX: number,
  tapY: number,
  playerId: number,
): DiscPosition | null {
  let closest: DiscPosition | null = null;
  let closestDist = HIT_RADIUS;

  for (const disc of discs) {
    if (disc.playerId !== playerId) continue;
    if (disc.posX == null || disc.posY == null) continue;
    const dx = tapX - disc.posX;
    const dy = tapY - disc.posY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < closestDist) {
      closestDist = dist;
      closest = disc;
    }
  }

  return closest;
}

export { RING_THRESHOLDS, HIT_RADIUS };
