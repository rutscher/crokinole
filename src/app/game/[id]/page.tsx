import { getGame } from "@/lib/actions/games";
import { notFound } from "next/navigation";
import { GameClient } from "./game-client";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function GamePage({ params }: Props) {
  const { id } = await params;
  const game = await getGame(Number(id));

  if (!game) {
    notFound();
  }

  return <GameClient game={game} />;
}
