import { describe, it, expect } from "vitest";
import {
  createPlayer,
  getPlayers,
  updatePlayer,
  deletePlayer,
} from "@/lib/actions/players";

describe("player actions", () => {
  it("creates a player and returns it", async () => {
    const player = await createPlayer("Alice");
    expect(player.name).toBe("Alice");
    expect(player.id).toBeDefined();
  });

  it("rejects duplicate names", async () => {
    await createPlayer("Alice");
    await expect(createPlayer("Alice")).rejects.toThrow();
  });

  it("rejects empty names", async () => {
    await expect(createPlayer("")).rejects.toThrow();
    await expect(createPlayer("   ")).rejects.toThrow();
  });

  it("lists all players alphabetically", async () => {
    await createPlayer("Charlie");
    await createPlayer("Alice");
    await createPlayer("Bob");
    const players = await getPlayers();
    expect(players.map((p) => p.name)).toEqual(["Alice", "Bob", "Charlie"]);
  });

  it("updates a player name", async () => {
    const player = await createPlayer("Alice");
    const updated = await updatePlayer(player.id, "Alicia");
    expect(updated.name).toBe("Alicia");
  });

  it("deletes a player", async () => {
    const player = await createPlayer("Alice");
    await deletePlayer(player.id);
    const players = await getPlayers();
    expect(players).toHaveLength(0);
  });
});
