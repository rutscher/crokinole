"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RoundResult {
  roundNumber: number;
  player1Name: string;
  player2Name: string;
  player1RoundScore: number;
  player2RoundScore: number;
  pointsAwarded: number;
  winnerName: string | null;
  newPlayer1Score: number;
  newPlayer2Score: number;
}

interface RoundSummaryDialogProps {
  result: RoundResult | null;
  onDismiss: () => void;
}

export function RoundSummaryDialog({ result, onDismiss }: RoundSummaryDialogProps) {
  if (!result) return null;

  return (
    <Dialog open={true}>
      <DialogContent className="text-center max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-xl">Round {result.roundNumber}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Round scores */}
          <div className="flex items-center justify-center gap-6 text-2xl font-bold tabular-nums">
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">{result.player1Name}</div>
              <div>{result.player1RoundScore}</div>
            </div>
            <div className="text-muted-foreground">vs</div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">{result.player2Name}</div>
              <div>{result.player2RoundScore}</div>
            </div>
          </div>

          {/* Outcome */}
          <div className="text-lg">
            {result.winnerName ? (
              <span className="text-emerald-400 font-semibold">
                {result.winnerName} +{result.pointsAwarded}
              </span>
            ) : (
              <span className="text-muted-foreground">Tied round</span>
            )}
          </div>

          {/* New game scores */}
          <div className="text-sm text-muted-foreground">
            Game: {result.player1Name} {result.newPlayer1Score} — {result.newPlayer2Score} {result.player2Name}
          </div>
        </div>

        <Button onClick={onDismiss} className="w-full" size="lg">
          Next Round
        </Button>
      </DialogContent>
    </Dialog>
  );
}
