"use server";

import { db } from "@/lib/db";

export async function createPlayer(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Player name cannot be empty");
  }
  return db.player.create({ data: { name: trimmed } });
}

export async function getPlayers() {
  return db.player.findMany({ orderBy: { name: "asc" } });
}

export async function updatePlayer(id: number, name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Player name cannot be empty");
  }
  return db.player.update({ where: { id }, data: { name: trimmed } });
}

export async function deletePlayer(id: number) {
  const activeGames = await db.game.count({
    where: {
      status: "in_progress",
      OR: [{ player1Id: id }, { player2Id: id }],
    },
  });
  if (activeGames > 0) {
    throw new Error("Cannot delete player with active games");
  }
  return db.player.delete({ where: { id } });
}
