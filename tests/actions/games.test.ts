import { describe, it, expect, beforeEach } from "vitest";
import { createPlayer } from "@/lib/actions/players";
import { createGame, getGame, deleteGame, updateGameScore } from "@/lib/actions/games";
import { addDisc, endRound } from "@/lib/actions/rounds";

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

describe("deleteGame", () => {
  it("deletes a game with no rounds played", async () => {
    const game = await createGame(player1Id, player2Id, player1Id);
    await deleteGame(game.id);
    const result = await getGame(game.id);
    expect(result).toBeNull();
  });

  it("deletes a game with rounds and discs", async () => {
    const game = await createGame(player1Id, player2Id, player1Id);
    await addDisc(game.id, player1Id, 20);
    await addDisc(game.id, player2Id, 15);
    await endRound(game.id);
    await deleteGame(game.id);
    const result = await getGame(game.id);
    expect(result).toBeNull();
  });

  it("throws when deleting non-existent game", async () => {
    await expect(deleteGame(99999)).rejects.toThrow();
  });
});

describe("updateGameScore", () => {
  it("updates scores and recalculates winner", async () => {
    const game = await createGame(player1Id, player2Id, player1Id);
    await addDisc(game.id, player1Id, 20);
    await endRound(game.id);
    await addDisc(game.id, player1Id, 20);
    await endRound(game.id);
    await addDisc(game.id, player1Id, 20);
    await endRound(game.id);
    await addDisc(game.id, player1Id, 20);
    await endRound(game.id);
    await addDisc(game.id, player1Id, 20);
    await endRound(game.id);

    await updateGameScore(game.id, 50, 90);
    const updated = await getGame(game.id);
    expect(updated!.player1Score).toBe(50);
    expect(updated!.player2Score).toBe(90);
    expect(updated!.winnerId).toBe(player2Id);
  });

  it("sets winner to null on tied scores", async () => {
    const game = await createGame(player1Id, player2Id, player1Id);
    await addDisc(game.id, player1Id, 20);
    await endRound(game.id);
    await addDisc(game.id, player1Id, 20);
    await endRound(game.id);
    await addDisc(game.id, player1Id, 20);
    await endRound(game.id);
    await addDisc(game.id, player1Id, 20);
    await endRound(game.id);
    await addDisc(game.id, player1Id, 20);
    await endRound(game.id);

    await updateGameScore(game.id, 75, 75);
    const updated = await getGame(game.id);
    expect(updated!.winnerId).toBeNull();
  });

  it("rejects negative scores", async () => {
    const game = await createGame(player1Id, player2Id, player1Id);
    await expect(updateGameScore(game.id, -10, 50)).rejects.toThrow(
      "Scores cannot be negative"
    );
  });
});
