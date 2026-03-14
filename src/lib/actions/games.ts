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
