import { getPlayers } from "@/lib/actions/players";
import { getPlayerStats, getHeadToHead, getMatchHistory } from "@/lib/actions/stats";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import Link from "next/link";
import { redirect } from "next/navigation";

interface Props {
  searchParams: Promise<{ player?: string; opponent?: string }>;
}

export default async function StatsPage({ searchParams }: Props) {
  const { player: playerParam, opponent: opponentParam } = await searchParams;
  const players = await getPlayers();

  const selectedPlayerId = playerParam ? Number(playerParam) : null;
  const selectedOpponentId = opponentParam ? Number(opponentParam) : null;

  const stats = selectedPlayerId ? await getPlayerStats(selectedPlayerId) : null;
  const h2h =
    selectedPlayerId && selectedOpponentId
      ? await getHeadToHead(selectedPlayerId, selectedOpponentId)
      : null;
  const history = selectedPlayerId ? await getMatchHistory(selectedPlayerId) : null;

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId);

  async function selectPlayer(formData: FormData) {
    "use server";
    const id = formData.get("playerId") as string;
    redirect(`/stats?player=${id}`);
  }

  async function selectOpponent(formData: FormData) {
    "use server";
    const id = formData.get("opponentId") as string;
    redirect(`/stats?player=${selectedPlayerId}&opponent=${id}`);
  }

  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Stats</h1>
        <Link href="/">
          <Button variant="ghost" size="sm">Back</Button>
        </Link>
      </div>

      <Card className="mb-6">
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {players.map((p) => (
              <form key={p.id} action={selectPlayer}>
                <input type="hidden" name="playerId" value={p.id} />
                <Button
                  type="submit"
                  variant={p.id === selectedPlayerId ? "default" : "outline"}
                  size="sm"
                  className="rounded-full px-4"
                  style={p.id === selectedPlayerId ? {
                    background: "radial-gradient(circle at 40% 35%, #3a3430, #292420 60%, #1f1c19)",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
                    border: "none",
                  } : undefined}
                >
                  {p.name}
                </Button>
              </form>
            ))}
          </div>
        </CardContent>
      </Card>

      {stats && selectedPlayer && (
        <>
          <h2 className="text-lg font-semibold mb-3">{selectedPlayer.name}</h2>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <StatCard label="Record" value={`${stats.wins}W - ${stats.losses}L`} />
            <StatCard label="Win %" value={`${stats.winPercent}%`} variant="positive" />
            <StatCard label="Avg Margin" value={stats.avgMargin > 0 ? `+${stats.avgMargin}` : stats.avgMargin} variant={stats.avgMargin > 0 ? "positive" : stats.avgMargin < 0 ? "negative" : "neutral"} />
            <StatCard label="Total 20s" value={stats.total20s} variant="positive" />
            <StatCard label="Avg Round" value={stats.avgRoundScore} />
            <StatCard label="Best Round" value={stats.highestRoundScore} variant="positive" />
            <StatCard label="Games" value={stats.gamesPlayed} />
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Head-to-Head</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-3">
                {players
                  .filter((p) => p.id !== selectedPlayerId)
                  .map((p) => (
                    <form key={p.id} action={selectOpponent}>
                      <input type="hidden" name="opponentId" value={p.id} />
                      <Button
                        type="submit"
                        variant={p.id === selectedOpponentId ? "default" : "outline"}
                        size="sm"
                        className="rounded-full px-4"
                        style={p.id === selectedOpponentId ? {
                          background: "radial-gradient(circle at 40% 35%, #3a3430, #292420 60%, #1f1c19)",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
                          border: "none",
                        } : undefined}
                      >
                        {p.name}
                      </Button>
                    </form>
                  ))}
              </div>
              {h2h && (
                <div className="text-center py-2">
                  <span className="text-2xl font-bold">
                    {h2h.wins} - {h2h.losses}
                  </span>
                  <span className="text-muted-foreground ml-2">
                    ({h2h.gamesPlayed} games)
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {history && history.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Match History</h2>
              <div className="space-y-3">
                {history.map((game) => (
                  <Card key={game.id}>
                    <CardContent>
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
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!selectedPlayerId && (
        <p className="text-muted-foreground text-center py-8">
          Select a player to view their stats.
        </p>
      )}
    </div>
  );
}
