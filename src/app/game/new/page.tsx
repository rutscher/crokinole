import { getPlayers } from "@/lib/actions/players";
import { createGame } from "@/lib/actions/games";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlayerPicker } from "@/components/player-picker";
import { HammerPicker } from "@/components/hammer-picker";
import Link from "next/link";

interface Props {
  searchParams: Promise<{ p1?: string; p2?: string }>;
}

export default async function NewGamePage({ searchParams }: Props) {
  const { p1, p2 } = await searchParams;
  const players = await getPlayers();
  const defaultPlayer1 = p1 ? players.find((p) => p.id === Number(p1))?.name : undefined;
  const defaultPlayer2 = p2 ? players.find((p) => p.id === Number(p2))?.name : undefined;

  async function handleCreate(formData: FormData) {
    "use server";
    const { db } = await import("@/lib/db");
    const player1Name = formData.get("player1") as string;
    const player2Name = formData.get("player2") as string;
    const hammerValue = formData.get("hammer") as string;

    const p1 = await db.player.findUniqueOrThrow({ where: { name: player1Name } });
    const p2 = await db.player.findUniqueOrThrow({ where: { name: player2Name } });

    const hammerPlayerId = hammerValue === "Random"
      ? (Math.random() < 0.5 ? p1.id : p2.id)
      : (await db.player.findUniqueOrThrow({ where: { name: hammerValue } })).id;

    const game = await createGame(p1.id, p2.id, hammerPlayerId);
    redirect(`/game/${game.id}`);
  }

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
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">New Game</h1>
        <Link href="/">
          <Button variant="ghost" size="sm">Back</Button>
        </Link>
      </div>

      <form action={handleCreate}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Players</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Player 1</label>
              <PlayerPicker
                players={players}
                name="player1"
                placeholder="Select player 1"
                defaultValue={defaultPlayer1}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Player 2</label>
              <PlayerPicker
                players={players}
                name="player2"
                placeholder="Select player 2"
                defaultValue={defaultPlayer2}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>First Hammer</CardTitle>
          </CardHeader>
          <CardContent>
            <HammerPicker players={players} />
          </CardContent>
        </Card>

        <Button type="submit" className="w-full h-14 text-lg" size="lg">
          Start Game
        </Button>
      </form>
    </div>
  );
}
