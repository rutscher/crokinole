import { describe, it, expect } from "vitest";
import {
  createPlayer,
  getPlayers,
  updatePlayer,
  deletePlayer,
  getRecentPlayers,
} from "@/lib/actions/players";
import { createGame } from "@/lib/actions/games";

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

describe("getRecentPlayers", () => {
  it("returns empty array when no games exist", async () => {
    await createPlayer("Alice");
    const recents = await getRecentPlayers();
    expect(recents).toEqual([]);
  });

  it("returns players ordered by most recent game appearance", async () => {
    const alice = await createPlayer("Alice");
    const bob = await createPlayer("Bob");
    const charlie = await createPlayer("Charlie");
    // Alice vs Bob (older game)
    await createGame(alice.id, bob.id, alice.id);
    // Charlie vs Alice (newer game)
    await createGame(charlie.id, alice.id, charlie.id);

    const recents = await getRecentPlayers();
    const names = recents.map((p) => p.name);
    // Charlie and Alice tied for most recent game, but both before Bob
    expect(names.indexOf("Bob")).toBeGreaterThan(names.indexOf("Charlie"));
    expect(names.indexOf("Bob")).toBeGreaterThan(names.indexOf("Alice"));
  });

  it("respects limit parameter", async () => {
    const alice = await createPlayer("Alice");
    const bob = await createPlayer("Bob");
    const charlie = await createPlayer("Charlie");
    await createGame(alice.id, bob.id, alice.id);
    await createGame(charlie.id, alice.id, charlie.id);

    const recents = await getRecentPlayers(2);
    expect(recents).toHaveLength(2);
  });

  it("only returns players who have played games", async () => {
    const alice = await createPlayer("Alice");
    const bob = await createPlayer("Bob");
    await createPlayer("Charlie"); // never plays a game
    await createGame(alice.id, bob.id, alice.id);

    const recents = await getRecentPlayers();
    const names = recents.map((p) => p.name);
    expect(names).toContain("Alice");
    expect(names).toContain("Bob");
    expect(names).not.toContain("Charlie");
  });

  it("includes players from in-progress games", async () => {
    const alice = await createPlayer("Alice");
    const bob = await createPlayer("Bob");
    // createGame creates an in-progress game by default
    await createGame(alice.id, bob.id, alice.id);

    const recents = await getRecentPlayers();
    const names = recents.map((p) => p.name);
    expect(names).toContain("Alice");
    expect(names).toContain("Bob");
  });
});
