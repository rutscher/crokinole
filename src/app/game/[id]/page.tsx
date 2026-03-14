import { getGame } from "@/lib/actions/games";
import { notFound } from "next/navigation";
import { GameClient } from "./game-client";
import { GameDetail } from "./game-detail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function GamePage({ params }: Props) {
  const { id } = await params;
  const game = await getGame(Number(id));

  if (!game) {
    notFound();
  }

  if (game.status === "completed") {
    return <GameDetail game={game} />;
  }

  return <GameClient game={game} />;
}
