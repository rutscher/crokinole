"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface GameOverDialogProps {
  open: boolean;
  winnerName: string;
  player1Name: string;
  player1Score: number;
  player2Name: string;
  player2Score: number;
  player1Id: number;
  player2Id: number;
}

export function GameOverDialog({
  open,
  winnerName,
  player1Name,
  player1Score,
  player2Name,
  player2Score,
  player1Id,
  player2Id,
}: GameOverDialogProps) {
  const router = useRouter();

  return (
    <Dialog open={open}>
      <DialogContent className="text-center">
        <DialogHeader>
          <DialogTitle className="text-3xl">{winnerName} Wins!</DialogTitle>
          <DialogDescription className="text-lg mt-2">
            {player1Name} {player1Score} — {player2Score} {player2Name}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-4">
          <Link href={`/game/new?p1=${player1Id}&p2=${player2Id}`}>
            <Button
              className="w-full"
              size="lg"
              style={{
                background: "linear-gradient(135deg, var(--rail-2), var(--rail-3))",
                color: "#1a1400",
                border: "none",
              }}
            >
              Rematch
            </Button>
          </Link>
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => router.refresh()}
          >
            View Details
          </Button>
          <Link href="/">
            <Button variant="secondary" className="w-full" size="lg">
              Home
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
