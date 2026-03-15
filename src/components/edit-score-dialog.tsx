"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateGameScore } from "@/lib/actions/games";

interface EditScoreDialogProps {
  open: boolean;
  onClose: () => void;
  gameId: number;
  player1Name: string;
  player2Name: string;
  currentPlayer1Score: number;
  currentPlayer2Score: number;
}

export function EditScoreDialog({
  open,
  onClose,
  gameId,
  player1Name,
  player2Name,
  currentPlayer1Score,
  currentPlayer2Score,
}: EditScoreDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [p1Score, setP1Score] = useState(currentPlayer1Score);
  const [p2Score, setP2Score] = useState(currentPlayer2Score);

  function handleSave() {
    startTransition(async () => {
      await updateGameScore(gameId, p1Score, p2Score);
      onClose();
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>Edit Score</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">
              {player1Name}
            </label>
            <Input
              type="number"
              min={0}
              value={p1Score}
              onChange={(e) => setP1Score(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">
              {player2Name}
            </label>
            <Input
              type="number"
              min={0}
              value={p2Score}
              onChange={(e) => setP2Score(Number(e.target.value))}
            />
          </div>
          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              className="w-full"
              onClick={handleSave}
              disabled={isPending}
              style={{
                background: "linear-gradient(135deg, var(--rail-2), var(--rail-3))",
                color: "#1a1400",
                border: "none",
              }}
            >
              {isPending ? "Saving..." : "Save"}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
