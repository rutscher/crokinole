import { getPlayers } from "@/lib/actions/players";
import { createGame } from "@/lib/actions/games";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlayerPicker } from "@/components/player-picker";
import Link from "next/link";

interface Props {
  searchParams: Promise<{ p1?: string; p2?: string }>;
}

export default async function NewGamePage({ searchParams }: Props) {
  const { p1, p2 } = await searchParams;
  const players = await getPlayers();
  const defaultPlayer1 = p1 ? Number(p1) : undefined;
  const defaultPlayer2 = p2 ? Number(p2) : undefined;

  async function handleCreate(formData: FormData) {
    "use server";
    const player1Id = Number(formData.get("player1"));
    const player2Id = Number(formData.get("player2"));
    const hammerPlayerId = Number(formData.get("hammer"));

    const game = await createGame(player1Id, player2Id, hammerPlayerId);
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
                defaultValue={defaultPlayer1 ? String(defaultPlayer1) : undefined}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Player 2</label>
              <PlayerPicker
                players={players}
                name="player2"
                placeholder="Select player 2"
                defaultValue={defaultPlayer2 ? String(defaultPlayer2) : undefined}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>First Hammer</CardTitle>
          </CardHeader>
          <CardContent>
            <PlayerPicker
              players={players}
              name="hammer"
              placeholder="Who gets first hammer?"
            />
          </CardContent>
        </Card>

        <Button type="submit" className="w-full h-14 text-lg" size="lg">
          Start Game
        </Button>
      </form>
    </div>
  );
}
