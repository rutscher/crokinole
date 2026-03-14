"use server";

import { db } from "@/lib/db";

export async function getPlayerStats(playerId: number) {
  const games = await db.game.findMany({
    where: {
      status: "completed",
      OR: [{ player1Id: playerId }, { player2Id: playerId }],
    },
  });

  const wins = games.filter((g) => g.winnerId === playerId).length;
  const losses = games.length - wins;
  const gamesPlayed = games.length;
  const winPercent = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;

  const totalMargin = games.reduce((sum, g) => {
    const playerScore = g.player1Id === playerId ? g.player1Score : g.player2Score;
    const opponentScore = g.player1Id === playerId ? g.player2Score : g.player1Score;
    return sum + (playerScore - opponentScore);
  }, 0);
  const avgMargin = gamesPlayed > 0 ? Math.round((totalMargin / gamesPlayed) * 10) / 10 : 0;

  const total20s = await db.disc.count({
    where: {
      playerId,
      ringValue: 20,
      round: { game: { status: "completed" } },
    },
  });

  const rounds = await db.round.findMany({
    where: {
      status: "completed",
      game: {
        status: "completed",
        OR: [{ player1Id: playerId }, { player2Id: playerId }],
      },
    },
    select: {
      player1RoundScore: true,
      player2RoundScore: true,
      game: { select: { player1Id: true } },
    },
  });

  const roundScores = rounds.map((r) =>
    r.game.player1Id === playerId ? r.player1RoundScore : r.player2RoundScore
  );

  const avgRoundScore =
    roundScores.length > 0
      ? Math.round((roundScores.reduce((a, b) => a + b, 0) / roundScores.length) * 10) / 10
      : 0;

  const highestRoundScore =
    roundScores.length > 0 ? Math.max(...roundScores) : 0;

  return {
    wins,
    losses,
    gamesPlayed,
    winPercent,
    avgMargin,
    total20s,
    avgRoundScore,
    highestRoundScore,
  };
}

export async function getHeadToHead(playerId: number, opponentId: number) {
  const games = await db.game.findMany({
    where: {
      status: "completed",
      OR: [
        { player1Id: playerId, player2Id: opponentId },
        { player1Id: opponentId, player2Id: playerId },
      ],
    },
  });

  const wins = games.filter((g) => g.winnerId === playerId).length;
  const losses = games.filter((g) => g.winnerId === opponentId).length;

  return { wins, losses, gamesPlayed: games.length };
}

export async function getMatchHistory(playerId: number) {
  return db.game.findMany({
    where: {
      status: "completed",
      OR: [{ player1Id: playerId }, { player2Id: playerId }],
    },
    orderBy: { createdAt: "desc" },
    include: {
      player1: true,
      player2: true,
      winner: true,
    },
  });
}
