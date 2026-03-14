"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ExitMenuDialogProps {
  open: boolean;
  onClose: () => void;
  gameId: number;
}

export function ExitMenuDialog({ open, onClose, gameId }: ExitMenuDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>Game Menu</DialogTitle>
        </DialogHeader>
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
          <a href="/">
            <Button variant="outline" size="lg" className="w-full">
              Save & Exit
            </Button>
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
