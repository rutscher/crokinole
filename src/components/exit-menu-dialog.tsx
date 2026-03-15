"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteGame } from "@/lib/actions/games";

interface ExitMenuDialogProps {
  open: boolean;
  onClose: () => void;
  gameId: number;
  onUndoRound?: () => void;
  canUndoRound?: boolean;
  onEndRound?: () => void;
  canEndRound?: boolean;
}

export function ExitMenuDialog({
  open,
  onClose,
  gameId,
  onUndoRound,
  canUndoRound = false,
  onEndRound,
  canEndRound = false,
}: ExitMenuDialogProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteGame(gameId);
      router.push("/");
    });
  }

  function handleClose() {
    setConfirming(false);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>{confirming ? "Delete Game" : "Game Menu"}</DialogTitle>
        </DialogHeader>
        {confirming ? (
          <div className="flex flex-col gap-3 mt-2">
            <p className="text-sm text-muted-foreground">
              Delete this game? This can&apos;t be undone.
            </p>
            <Button
              variant="destructive"
              size="lg"
              className="w-full"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? "Deleting..." : "Delete"}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => setConfirming(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 mt-2">
            <Button
              onClick={onClose}
              size="lg"
              className="w-full"
              style={{
                background: "linear-gradient(135deg, var(--rail-2), var(--rail-3))",
                color: "#1a1400",
                border: "none",
              }}
            >
              Resume Game
            </Button>
            {canUndoRound && onUndoRound && (
              <Button
                variant="outline"
                size="lg"
                className="w-full border-destructive/30 text-destructive"
                onClick={() => {
                  onUndoRound();
                  onClose();
                }}
              >
                Undo Last Round
              </Button>
            )}
            {canEndRound && onEndRound && (
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => {
                  onEndRound();
                  onClose();
                }}
              >
                End Round
              </Button>
            )}
            <Link href="/">
              <Button variant="outline" size="lg" className="w-full">
                Save & Exit
              </Button>
            </Link>
            <Button
              variant="destructive"
              size="lg"
              className="w-full"
              onClick={() => setConfirming(true)}
            >
              Delete Game
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
