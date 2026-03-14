import { getPlayers, createPlayer, deletePlayer } from "@/lib/actions/players";
import { revalidatePath } from "next/cache";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default async function PlayersPage() {
  const players = await getPlayers();

  async function handleCreate(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    if (name?.trim()) {
      await createPlayer(name);
      revalidatePath("/players");
    }
  }

  async function handleDelete(formData: FormData) {
    "use server";
    const id = Number(formData.get("id"));
    await deletePlayer(id);
    revalidatePath("/players");
  }

  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Players</h1>
        <Link href="/">
          <Button variant="ghost" size="sm">Back</Button>
        </Link>
      </div>

      <form action={handleCreate} className="flex gap-2 mb-6">
        <Input
          name="name"
          placeholder="New player name"
          className="flex-1"
          required
        />
        <Button type="submit">Add</Button>
      </form>

      <div className="space-y-2">
        {players.map((player) => (
          <Card key={player.id}>
            <CardContent className="flex items-center justify-between p-4">
              <span className="font-medium">{player.name}</span>
              <form action={handleDelete}>
                <input type="hidden" name="id" value={player.id} />
                <Button variant="ghost" size="sm" type="submit" className="text-destructive">
                  Remove
                </Button>
              </form>
            </CardContent>
          </Card>
        ))}
        {players.length === 0 && (
          <p className="text-muted-foreground text-center py-8">
            No players yet. Add someone to get started!
          </p>
        )}
      </div>
    </div>
  );
}
