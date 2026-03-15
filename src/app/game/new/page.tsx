export const dynamic = "force-dynamic";

import { getPlayers, getRecentPlayers } from "@/lib/actions/players";
import { NewGameClient } from "@/components/new-game-client";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface Props {
  searchParams: Promise<{ p1?: string; p2?: string }>;
}

export default async function NewGamePage({ searchParams }: Props) {
  const { p1, p2 } = await searchParams;
  const [players, recentPlayers] = await Promise.all([
    getPlayers(),
    getRecentPlayers(),
  ]);

  if (players.length < 2) {
    return (
      <div className="min-h-screen bg-background p-4 max-w-md mx-auto">
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold mb-4">Need More Players</h1>
          <p className="text-muted-foreground mb-6">
            Add at least 2 players to start a game.
          </p>
          <Link href="/players">
            <Button>Manage Players</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <NewGameClient
      players={players}
      recentPlayers={recentPlayers}
      defaultPlayer1Id={p1 ? Number(p1) : undefined}
      defaultPlayer2Id={p2 ? Number(p2) : undefined}
    />
  );
}
