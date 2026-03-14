import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

interface GameDetailProps {
  game: {
    id: number;
    player1Score: number;
    player2Score: number;
    player1: { id: number; name: string };
    player2: { id: number; name: string };
    winner: { name: string } | null;
    rounds: Array<{
      roundNumber: number;
      player1RoundScore: number;
      player2RoundScore: number;
      pointsAwarded: number;
      awardedToPlayerId: number | null;
      hammerPlayerId: number;
    }>;
    createdAt: Date;
  };
}

export function GameDetail({ game }: GameDetailProps) {
  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Game Details</h1>
        <Link href="/">
          <Button variant="ghost" size="sm">Back</Button>
        </Link>
      </div>

      {/* Final Score */}
      <Card className="mb-6">
        <CardContent className="p-6 text-center">
          {game.winner && (
            <div className="text-lg font-semibold mb-2" style={{ color: "var(--lead)" }}>
              {game.winner.name} Wins!
            </div>
          )}
          <div className="flex items-center justify-center gap-6 text-3xl font-bold tabular-nums">
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-1">{game.player1.name}</div>
              <div>{game.player1Score}</div>
            </div>
            <div className="text-muted-foreground text-lg">—</div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-1">{game.player2.name}</div>
              <div>{game.player2Score}</div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-3">
            {new Date(game.createdAt).toLocaleDateString()} — {game.rounds.length} rounds
          </div>
        </CardContent>
      </Card>

      {/* Round-by-round breakdown */}
      <h2 className="text-lg font-semibold mb-3">Rounds</h2>
      <div className="space-y-2">
        {game.rounds.map((round) => {
          const p1Won = round.awardedToPlayerId === game.player1.id;
          const p2Won = round.awardedToPlayerId === game.player2.id;
          const hadHammer = round.hammerPlayerId === game.player1.id
            ? game.player1.name : game.player2.name;

          return (
            <Card key={round.roundNumber}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground w-8">R{round.roundNumber}</span>
                  <div className="flex items-center gap-4 tabular-nums">
                    <span className="font-semibold" style={p1Won ? { color: "var(--lead)" } : undefined}>
                      {round.player1RoundScore}
                    </span>
                    <span className="text-xs text-muted-foreground">vs</span>
                    <span className="font-semibold" style={p2Won ? { color: "var(--lead)" } : undefined}>
                      {round.player2RoundScore}
                    </span>
                  </div>
                  <div className="text-right text-xs text-muted-foreground w-20">
                    {round.pointsAwarded > 0 ? (
                      <span style={{ color: "var(--lead)" }}>+{round.pointsAwarded}</span>
                    ) : (
                      "Tie"
                    )}
                    <div className="text-[10px]">{hadHammer} H</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-6">
        <a href={`/game/new?p1=${game.player1.id}&p2=${game.player2.id}`} className="flex-1">
          <Button
            className="w-full"
            size="lg"
            style={{
              background: "linear-gradient(135deg, var(--rail-2), var(--rail-3))",
              color: "#1a1400",
              border: "none",
            }}
          >Rematch</Button>
        </a>
        <Link href="/stats" className="flex-1">
          <Button variant="secondary" className="w-full" size="lg">Stats</Button>
        </Link>
      </div>
    </div>
  );
}
