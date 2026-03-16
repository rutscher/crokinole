import { describe, it, expect } from "vitest";
import { getRingValue, findDiscAtPosition } from "@/lib/board-utils";

// Thresholds: 0–0.08 = 20, 0.08–0.39 = 15, 0.39–0.69 = 10, 0.69–1.0 = 5

describe("getRingValue", () => {
  it("returns 20 for center hole (radius 0 to <0.08)", () => {
    expect(getRingValue(0, 0)).toBe(20);
    expect(getRingValue(0.04, 0.04)).toBe(20); // ~0.057
  });

  it("returns 15 for inner ring (radius 0.08 to <0.39)", () => {
    expect(getRingValue(0.1, 0.0)).toBe(15);
    expect(getRingValue(0.2, 0.2)).toBe(15); // ~0.283
    expect(getRingValue(0.3, 0.0)).toBe(15);
  });

  it("returns 10 for middle ring (radius 0.39 to <0.69)", () => {
    expect(getRingValue(0.5, 0.0)).toBe(10);
    expect(getRingValue(0.4, 0.4)).toBe(10); // ~0.566
    expect(getRingValue(0.0, 0.6)).toBe(10);
  });

  it("returns 5 for outer ring (radius 0.69 to 1.0)", () => {
    expect(getRingValue(0.8, 0.0)).toBe(5);
    expect(getRingValue(0.0, 0.9)).toBe(5);
    expect(getRingValue(0.7, 0.7)).toBe(5); // ~0.99
  });

  it("scores boundary taps to the lower ring (spec rule)", () => {
    expect(getRingValue(0.08, 0.0)).toBe(15);  // exactly on 20/15 line → 15
    expect(getRingValue(0.39, 0.0)).toBe(10);  // exactly on 15/10 line → 10
    expect(getRingValue(0.69, 0.0)).toBe(5);   // exactly on 10/5 line → 5
    expect(getRingValue(1.0, 0.0)).toBe(5);    // outer edge → still on board
  });

  it("returns null for taps outside the board (radius > 1.0)", () => {
    expect(getRingValue(1.0, 0.1)).toBeNull();
    expect(getRingValue(0.8, 0.8)).toBeNull();
  });
});

describe("findDiscAtPosition", () => {
  const discs = [
    { id: 1, playerId: 1, ringValue: 10, posX: 0.5, posY: 0.0 },
    { id: 2, playerId: 1, ringValue: 15, posX: 0.0, posY: 0.3 },
    { id: 3, playerId: 2, ringValue: 5, posX: -0.8, posY: 0.0 },
  ];

  it("returns disc when tap is within hit radius (0.08)", () => {
    const result = findDiscAtPosition(discs, 0.52, 0.02, 1);
    expect(result?.id).toBe(1);
  });

  it("returns null when tap is not near any own disc", () => {
    const result = findDiscAtPosition(discs, 0.0, 0.0, 1);
    expect(result).toBeNull();
  });

  it("only matches own discs, not opponent discs", () => {
    const result = findDiscAtPosition(discs, -0.8, 0.0, 1);
    expect(result).toBeNull();
  });

  it("returns closest disc when multiple are within range", () => {
    const closeDiscs = [
      { id: 10, playerId: 1, ringValue: 10, posX: 0.5, posY: 0.0 },
      { id: 11, playerId: 1, ringValue: 15, posX: 0.55, posY: 0.0 },
    ];
    const result = findDiscAtPosition(closeDiscs, 0.53, 0.0, 1);
    expect(result?.id).toBe(11);
  });
});
