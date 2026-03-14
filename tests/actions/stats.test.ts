import { describe, it, expect, beforeEach } from "vitest";
import { createPlayer } from "@/lib/actions/players";
import { createGame } from "@/lib/actions/games";
import { addDisc, endRound } from "@/lib/actions/rounds";
import { getPlayerStats, getHeadToHead, getMatchHistory } from "@/lib/actions/stats";

let player1Id: number;
let player2Id: number;

async function playGame(p1Score: number, p2Score: number) {
  const game = await createGame(player1Id, player2Id, player1Id);
  let remaining = p1Score;
  while (remaining >= 20) {
    await addDisc(game.id, player1Id, 20);
    remaining -= 20;
  }
  while (remaining >= 5) {
    await addDisc(game.id, player1Id, 5);
    remaining -= 5;
  }

  remaining = p2Score;
  while (remaining >= 20) {
    await addDisc(game.id, player2Id, 20);
    remaining -= 20;
  }
  while (remaining >= 5) {
    await addDisc(game.id, player2Id, 5);
    remaining -= 5;
  }

  await endRound(game.id);
  return game.id;
}

beforeEach(async () => {
  const p1 = await createPlayer("Alice");
  const p2 = await createPlayer("Bob");
  player1Id = p1.id;
  player2Id = p2.id;
});

describe("getPlayerStats", () => {
  it("returns correct stats after games", async () => {
    await playGame(100, 0);
    await playGame(100, 0);

    const stats = await getPlayerStats(player1Id);
    expect(stats.wins).toBe(2);
    expect(stats.losses).toBe(0);
    expect(stats.gamesPlayed).toBe(2);
    expect(stats.winPercent).toBe(100);
    expect(stats.total20s).toBe(10);
    expect(stats.avgMargin).toBe(100);
    expect(stats.avgRoundScore).toBe(100);
    expect(stats.highestRoundScore).toBe(100);
  });

  it("returns zero stats for player with no games", async () => {
    const stats = await getPlayerStats(player1Id);
    expect(stats.wins).toBe(0);
    expect(stats.losses).toBe(0);
    expect(stats.gamesPlayed).toBe(0);
  });
});

describe("getHeadToHead", () => {
  it("returns head-to-head record", async () => {
    await playGame(100, 0);
    await playGame(100, 0);

    const h2h = await getHeadToHead(player1Id, player2Id);
    expect(h2h.wins).toBe(2);
    expect(h2h.losses).toBe(0);
  });
});

describe("getMatchHistory", () => {
  it("returns completed games for a player", async () => {
    await playGame(100, 0);

    const history = await getMatchHistory(player1Id);
    expect(history).toHaveLength(1);
    expect(history[0].player1.name).toBe("Alice");
  });
});
