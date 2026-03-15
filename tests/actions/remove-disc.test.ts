import { describe, it, expect, beforeEach } from "vitest";
import { createPlayer } from "@/lib/actions/players";
import { createGame, getGame } from "@/lib/actions/games";
import { addDisc, removeDisc } from "@/lib/actions/rounds";

let gameId: number;
let player1Id: number;
let player2Id: number;

beforeEach(async () => {
  const p1 = await createPlayer("Alice");
  const p2 = await createPlayer("Bob");
  player1Id = p1.id;
  player2Id = p2.id;
  const game = await createGame(player1Id, player2Id, player1Id);
  gameId = game.id;
});

describe("removeDisc", () => {
  it("removes a specific disc by ID", async () => {
    await addDisc(gameId, player1Id, 20);
    await addDisc(gameId, player1Id, 15);

    const game = await getGame(gameId);
    const firstDisc = game!.rounds[0].discs[0];

    await removeDisc(gameId, firstDisc.id);

    const updated = await getGame(gameId);
    expect(updated!.rounds[0].discs).toHaveLength(1);
    expect(updated!.rounds[0].discs[0].ringValue).toBe(15);
  });

  it("throws if disc does not belong to an in-progress round of the game", async () => {
    await addDisc(gameId, player1Id, 10);
    const game = await getGame(gameId);
    const discId = game!.rounds[0].discs[0].id;

    const p3 = await createPlayer("Charlie");
    const otherGame = await createGame(player1Id, p3.id, player1Id);

    await expect(removeDisc(otherGame.id, discId)).rejects.toThrow();
  });

  it("throws if disc ID does not exist", async () => {
    await expect(removeDisc(gameId, 99999)).rejects.toThrow();
  });
});
