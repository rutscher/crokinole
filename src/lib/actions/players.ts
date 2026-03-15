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

export async function getRecentPlayers(limit: number = 8) {
  // Get all game participant IDs with their most recent game date.
  // Two queries merged in JS since Prisma doesn't support UNION.
  const games = await db.game.findMany({
    select: {
      player1Id: true,
      player2Id: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Build map of playerId -> most recent game date
  const playerLastPlayed = new Map<number, Date>();
  for (const game of games) {
    for (const pid of [game.player1Id, game.player2Id]) {
      const existing = playerLastPlayed.get(pid);
      if (!existing || game.createdAt > existing) {
        playerLastPlayed.set(pid, game.createdAt);
      }
    }
  }

  if (playerLastPlayed.size === 0) return [];

  // Sort by most recent first, take limit
  const sortedIds = [...playerLastPlayed.entries()]
    .sort((a, b) => b[1].getTime() - a[1].getTime())
    .slice(0, limit)
    .map(([id]) => id);

  // Fetch full player objects (naturally excludes deleted players)
  const players = await db.player.findMany({
    where: { id: { in: sortedIds } },
  });

  // Re-sort to match the recency order (findMany doesn't guarantee order)
  const playerMap = new Map(players.map((p) => [p.id, p]));
  return sortedIds
    .map((id) => playerMap.get(id))
    .filter((p): p is NonNullable<typeof p> => p != null);
}
