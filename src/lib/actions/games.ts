"use server";

import { db } from "@/lib/db";

export async function getRecentGames() {
  return db.game.findMany({
    where: { status: "completed" },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      player1: true,
      player2: true,
      winner: true,
    },
  });
}

export async function getInProgressGames() {
  return db.game.findMany({
    where: { status: "in_progress" },
    orderBy: { createdAt: "desc" },
    include: {
      player1: true,
      player2: true,
    },
  });
}

export async function createGame(
  player1Id: number,
  player2Id: number,
  firstHammerPlayerId: number
) {
  if (player1Id === player2Id) {
    throw new Error("Players must be different");
  }
  if (firstHammerPlayerId !== player1Id && firstHammerPlayerId !== player2Id) {
    throw new Error("Hammer player must be one of the two game players");
  }

  return db.$transaction(async (tx) => {
    const game = await tx.game.create({
      data: {
        player1Id,
        player2Id,
        firstHammerPlayerId,
      },
    });

    await tx.round.create({
      data: {
        gameId: game.id,
        roundNumber: 1,
        hammerPlayerId: firstHammerPlayerId,
      },
    });

    return game;
  });
}

export async function deleteGame(id: number) {
  return db.$transaction(async (tx) => {
    const rounds = await tx.round.findMany({
      where: { gameId: id },
      select: { id: true },
    });

    const roundIds = rounds.map((r) => r.id);

    if (roundIds.length > 0) {
      await tx.disc.deleteMany({ where: { roundId: { in: roundIds } } });
    }
    await tx.round.deleteMany({ where: { gameId: id } });
    await tx.game.delete({ where: { id } });
  });
}

export async function updateGameScore(
  id: number,
  player1Score: number,
  player2Score: number
) {
  if (player1Score < 0 || player2Score < 0) {
    throw new Error("Scores cannot be negative");
  }

  const game = await db.game.findUnique({ where: { id } });
  if (!game) {
    throw new Error("Game not found");
  }

  let winnerId: number | null = null;
  if (player1Score > player2Score) {
    winnerId = game.player1Id;
  } else if (player2Score > player1Score) {
    winnerId = game.player2Id;
  }

  return db.game.update({
    where: { id },
    data: { player1Score, player2Score, winnerId },
  });
}

export async function getGame(id: number) {
  return db.game.findUnique({
    where: { id },
    include: {
      player1: true,
      player2: true,
      winner: true,
      rounds: {
        orderBy: { roundNumber: "asc" },
        include: { discs: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] } },
      },
    },
  });
}
