"use server";

import { db } from "@/lib/db";

const VALID_RING_VALUES = [5, 10, 15, 20];

export async function addDisc(gameId: number, playerId: number, ringValue: number) {
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
    },
  });
}

export async function undoDisc(gameId: number) {
  const currentRound = await db.round.findFirst({
    where: { gameId, status: "in_progress" },
    include: { discs: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 1 } },
  });

  if (!currentRound || currentRound.discs.length === 0) {
    return null;
  }

  return db.disc.delete({ where: { id: currentRound.discs[0].id } });
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
