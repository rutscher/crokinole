import { getRecentGames, getInProgressGames } from "@/lib/actions/games";
import { getPlayers } from "@/lib/actions/players";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default async function HomePage() {
  const [recentGames, inProgressGames, players] = await Promise.all([
    getRecentGames(),
    getInProgressGames(),
    getPlayers(),
  ]);

  const needsPlayers = players.length < 2;

  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto">
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold mb-2">Crokinole</h1>
        <p className="text-muted-foreground">Scorekeeper</p>
      </div>

      <div className="space-y-3 mb-8">
        {needsPlayers ? (
          <>
            <Link href="/players" className="block">
              <Button className="w-full h-14 text-lg" size="lg">
                Add Players to Get Started
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground text-center">
              Add at least 2 players to start a game
            </p>
          </>
        ) : (
          <Link href="/game/new" className="block">
            <Button className="w-full h-14 text-lg" size="lg">
              New Game
            </Button>
          </Link>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/players">
            <Button variant="secondary" className="w-full h-12">
              Players
            </Button>
          </Link>
          <Link href="/stats">
            <Button variant="secondary" className="w-full h-12">
              Stats
            </Button>
          </Link>
        </div>
      </div>

      {inProgressGames.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Resume Game</h2>
          <div className="space-y-2">
            {inProgressGames.map((game) => (
              <Link key={game.id} href={`/game/${game.id}`}>
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        {game.player1.name} {game.player1Score}
                        <span className="text-muted-foreground mx-2">vs</span>
                        {game.player2.name} {game.player2Score}
                      </div>
                      <span className="text-xs text-primary">Tap to resume</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {recentGames.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Recent Games</h2>
          <div className="space-y-2">
            {recentGames.map((game) => (
              <Link key={game.id} href={`/game/${game.id}`}>
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className={game.winnerId === game.player1Id ? "font-bold" : ""}>
                          {game.player1.name} {game.player1Score}
                        </span>
                        <span className="text-muted-foreground mx-2">vs</span>
                        <span className={game.winnerId === game.player2Id ? "font-bold" : ""}>
                          {game.player2.name} {game.player2Score}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(game.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
