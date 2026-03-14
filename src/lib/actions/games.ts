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
