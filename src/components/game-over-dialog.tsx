"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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
  return (
    <Dialog open={open}>
      <DialogContent className="text-center" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-3xl">{winnerName} Wins!</DialogTitle>
          <DialogDescription className="text-lg mt-2">
            {player1Name} {player1Score} &mdash; {player2Score} {player2Name}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-4">
          <a href={`/game/new?p1=${player1Id}&p2=${player2Id}`}>
            <Button className="w-full" size="lg">
              Rematch
            </Button>
          </a>
          <a href="/">
            <Button variant="secondary" className="w-full" size="lg">
              Home
            </Button>
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
