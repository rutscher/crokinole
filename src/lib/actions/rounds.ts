"use server";

import { db } from "@/lib/db";

const VALID_RING_VALUES = [5, 10, 15, 20];

export async function addDisc(
  gameId: number,
  playerId: number,
  ringValue: number,
  posX?: number,
  posY?: number,
) {
  if (!VALID_RING_VALUES.includes(ringValue)) {
    throw new Error(`Invalid ring value: ${ringValue}. Must be 5, 10, 15, or 20.`);
  }

  const currentRound = await db.round.findFirst({
    where: { gameId, status: "in_progress" },
  });

  if (!currentRound) {
    throw new Error("No active round found");
  }

  return db.disc.create({
    data: {
      roundId: currentRound.id,
      playerId,
      ringValue,
      posX: posX ?? null,
      posY: posY ?? null,
    },
  });
}

export async function undoDisc(gameId: number, playerId: number) {
  const currentRound = await db.round.findFirst({
    where: { gameId, status: "in_progress" },
    include: {
      discs: {
        where: { playerId },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 1,
      },
    },
  });

  if (!currentRound || currentRound.discs.length === 0) {
    return null;
  }

  return db.disc.delete({ where: { id: currentRound.discs[0].id } });
}

export async function removeDisc(gameId: number, discId: number) {
  const disc = await db.disc.findUnique({
    where: { id: discId },
    include: { round: true },
  });

  if (!disc) {
    throw new Error("Disc not found");
  }

  if (disc.round.gameId !== gameId || disc.round.status !== "in_progress") {
    throw new Error("Disc does not belong to an active round of this game");
  }

  return db.disc.delete({ where: { id: discId } });
}

export async function endRound(gameId: number) {
  const game = await db.game.findUnique({
    where: { id: gameId },
    include: {
      rounds: {
        where: { status: "in_progress" },
        include: { discs: true },
      },
    },
  });

  if (!game || game.rounds.length === 0) {
    throw new Error("No active round found");
  }

  const round = game.rounds[0];

  const player1RoundScore = round.discs
    .filter((d) => d.playerId === game.player1Id)
    .reduce((sum, d) => sum + d.ringValue, 0);

  const player2RoundScore = round.discs
    .filter((d) => d.playerId === game.player2Id)
    .reduce((sum, d) => sum + d.ringValue, 0);

  const difference = Math.abs(player1RoundScore - player2RoundScore);
  let awardedToPlayerId: number | null = null;

  if (player1RoundScore > player2RoundScore) {
    awardedToPlayerId = game.player1Id;
  } else if (player2RoundScore > player1RoundScore) {
    awardedToPlayerId = game.player2Id;
  }

  const newPlayer1Score =
    game.player1Score + (awardedToPlayerId === game.player1Id ? difference : 0);
  const newPlayer2Score =
    game.player2Score + (awardedToPlayerId === game.player2Id ? difference : 0);

  const isGameOver = newPlayer1Score >= 100 || newPlayer2Score >= 100;
  const winnerId = isGameOver
    ? newPlayer1Score >= 100
      ? game.player1Id
      : game.player2Id
    : null;

  const nextHammerPlayerId =
    round.hammerPlayerId === game.player1Id ? game.player2Id : game.player1Id;

  return db.$transaction(async (tx) => {
    const completedRound = await tx.round.update({
      where: { id: round.id },
      data: {
        player1RoundScore,
        player2RoundScore,
        pointsAwarded: difference,
        awardedToPlayerId,
        status: "completed",
      },
    });

    await tx.game.update({
      where: { id: gameId },
      data: {
        player1Score: newPlayer1Score,
        player2Score: newPlayer2Score,
        ...(isGameOver && {
          status: "completed",
          winnerId,
        }),
      },
    });

    if (!isGameOver) {
      await tx.round.create({
        data: {
          gameId,
          roundNumber: round.roundNumber + 1,
          hammerPlayerId: nextHammerPlayerId,
        },
      });
    }

    return completedRound;
  });
}

export async function undoRound(gameId: number) {
  const game = await db.game.findUnique({
    where: { id: gameId },
    include: {
      rounds: {
        orderBy: { roundNumber: "desc" },
        take: 2,
        include: { discs: true },
      },
    },
  });

  if (!game || game.status === "completed") {
    return null;
  }

  const rounds = game.rounds;
  if (rounds.length < 2) {
    return null;
  }

  const currentRound = rounds.find((r) => r.status === "in_progress");
  const lastCompletedRound = rounds.find((r) => r.status === "completed");

  if (!currentRound || !lastCompletedRound) {
    return null;
  }

  return db.$transaction(async (tx) => {
    await tx.disc.deleteMany({ where: { roundId: currentRound.id } });
    await tx.round.delete({ where: { id: currentRound.id } });

    await tx.round.update({
      where: { id: lastCompletedRound.id },
      data: {
        status: "in_progress",
        player1RoundScore: 0,
        player2RoundScore: 0,
        pointsAwarded: 0,
        awardedToPlayerId: null,
      },
    });

    const revertP1 = lastCompletedRound.awardedToPlayerId === game.player1Id
      ? lastCompletedRound.pointsAwarded : 0;
    const revertP2 = lastCompletedRound.awardedToPlayerId === game.player2Id
      ? lastCompletedRound.pointsAwarded : 0;

    await tx.game.update({
      where: { id: gameId },
      data: {
        player1Score: game.player1Score - revertP1,
        player2Score: game.player2Score - revertP2,
      },
    });

    return lastCompletedRound;
  });
}
