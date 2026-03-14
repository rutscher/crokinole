import { describe, it, expect, beforeEach } from "vitest";
import { createPlayer } from "@/lib/actions/players";
import { createGame, getGame } from "@/lib/actions/games";

let player1Id: number;
let player2Id: number;

beforeEach(async () => {
  const p1 = await createPlayer("Alice");
  const p2 = await createPlayer("Bob");
  player1Id = p1.id;
  player2Id = p2.id;
});

describe("game actions", () => {
  it("creates a game with initial round", async () => {
    const game = await createGame(player1Id, player2Id, player1Id);
    expect(game.status).toBe("in_progress");
    expect(game.player1Score).toBe(0);
    expect(game.player2Score).toBe(0);
    expect(game.firstHammerPlayerId).toBe(player1Id);
  });

  it("getGame returns game with current round and discs", async () => {
    const created = await createGame(player1Id, player2Id, player1Id);
    const game = await getGame(created.id);
    expect(game).toBeDefined();
    expect(game!.rounds).toHaveLength(1);
    expect(game!.rounds[0].roundNumber).toBe(1);
    expect(game!.rounds[0].hammerPlayerId).toBe(player1Id);
    expect(game!.rounds[0].status).toBe("in_progress");
  });

  it("rejects same player for both sides", async () => {
    await expect(createGame(player1Id, player1Id, player1Id)).rejects.toThrow();
  });
});
