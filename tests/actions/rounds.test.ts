import { describe, it, expect, beforeEach } from "vitest";
import { createPlayer } from "@/lib/actions/players";
import { createGame, getGame } from "@/lib/actions/games";
import { addDisc, undoDisc, endRound, undoRound } from "@/lib/actions/rounds";

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

describe("addDisc", () => {
  it("adds a disc to the current round", async () => {
    await addDisc(gameId, player1Id, 20);
    const game = await getGame(gameId);
    const currentRound = game!.rounds[0];
    expect(currentRound.discs).toHaveLength(1);
    expect(currentRound.discs[0].ringValue).toBe(20);
    expect(currentRound.discs[0].playerId).toBe(player1Id);
  });

  it("rejects invalid ring values", async () => {
    await expect(addDisc(gameId, player1Id, 7)).rejects.toThrow();
    await expect(addDisc(gameId, player1Id, 0)).rejects.toThrow();
    await expect(addDisc(gameId, player1Id, 25)).rejects.toThrow();
  });
});

describe("undoDisc", () => {
  it("removes the most recent disc for the game", async () => {
    await addDisc(gameId, player1Id, 20);
    await addDisc(gameId, player1Id, 15);
    await undoDisc(gameId, player1Id);
    const game = await getGame(gameId);
    expect(game!.rounds[0].discs).toHaveLength(1);
    expect(game!.rounds[0].discs[0].ringValue).toBe(20);
  });

  it("does nothing if no discs in current round", async () => {
    await undoDisc(gameId, player1Id);
    const game = await getGame(gameId);
    expect(game!.rounds[0].discs).toHaveLength(0);
  });
});

describe("endRound", () => {
  it("calculates difference and awards to higher scorer", async () => {
    await addDisc(gameId, player1Id, 20);
    await addDisc(gameId, player1Id, 15);
    await addDisc(gameId, player2Id, 10);
    // Player 1: 35, Player 2: 10, difference: 25

    const result = await endRound(gameId);
    expect(result.pointsAwarded).toBe(25);
    expect(result.awardedToPlayerId).toBe(player1Id);

    const game = await getGame(gameId);
    expect(game!.player1Score).toBe(25);
    expect(game!.player2Score).toBe(0);
    expect(game!.rounds).toHaveLength(2);
    expect(game!.rounds[1].roundNumber).toBe(2);
    expect(game!.rounds[1].hammerPlayerId).toBe(player2Id);
  });

  it("awards 0 on tie", async () => {
    await addDisc(gameId, player1Id, 10);
    await addDisc(gameId, player2Id, 10);

    const result = await endRound(gameId);
    expect(result.pointsAwarded).toBe(0);
    expect(result.awardedToPlayerId).toBeNull();

    const game = await getGame(gameId);
    expect(game!.player1Score).toBe(0);
    expect(game!.player2Score).toBe(0);
  });

  it("triggers game over when a player reaches 100", async () => {
    // Round 1: P1 scores 50 (no P2 discs, so difference = 50)
    await addDisc(gameId, player1Id, 20);
    await addDisc(gameId, player1Id, 20);
    await addDisc(gameId, player1Id, 10);
    await endRound(gameId);

    // Round 2: P1 scores 50 more (total 100)
    await addDisc(gameId, player1Id, 20);
    await addDisc(gameId, player1Id, 20);
    await addDisc(gameId, player1Id, 10);
    await endRound(gameId);

    const game = await getGame(gameId);
    expect(game!.status).toBe("completed");
    expect(game!.winnerId).toBe(player1Id);
    expect(game!.player1Score).toBe(100);
    expect(game!.player2Score).toBe(0);
  });

  it("handles empty round (0-0 tie)", async () => {
    const result = await endRound(gameId);
    expect(result.pointsAwarded).toBe(0);
    expect(result.awardedToPlayerId).toBeNull();
  });
});

describe("undoRound", () => {
  it("reverts the last completed round and reopens it", async () => {
    await addDisc(gameId, player1Id, 20);
    await addDisc(gameId, player1Id, 15);
    await addDisc(gameId, player2Id, 10);
    await endRound(gameId);

    let game = await getGame(gameId);
    expect(game!.player1Score).toBe(25);
    expect(game!.rounds).toHaveLength(2);

    const result = await undoRound(gameId);
    expect(result).not.toBeNull();

    game = await getGame(gameId);
    expect(game!.player1Score).toBe(0);
    expect(game!.player2Score).toBe(0);
    expect(game!.rounds).toHaveLength(1);
    expect(game!.rounds[0].status).toBe("in_progress");
    expect(game!.rounds[0].discs).toHaveLength(3);
  });

  it("returns null if only one round exists and it is in progress", async () => {
    const result = await undoRound(gameId);
    expect(result).toBeNull();
  });

  it("does nothing on a completed game", async () => {
    await addDisc(gameId, player1Id, 20);
    await addDisc(gameId, player1Id, 20);
    await addDisc(gameId, player1Id, 20);
    await addDisc(gameId, player1Id, 20);
    await addDisc(gameId, player1Id, 20);
    await endRound(gameId);

    const game = await getGame(gameId);
    expect(game!.status).toBe("completed");

    const result = await undoRound(gameId);
    expect(result).toBeNull();
  });
});
