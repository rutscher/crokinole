import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";

describe("test infrastructure", () => {
  it("can create and query a player", async () => {
    const player = await db.player.create({ data: { name: "TestPlayer" } });
    expect(player.name).toBe("TestPlayer");
    expect(player.id).toBeDefined();
  });
});
