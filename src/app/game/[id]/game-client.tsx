"use client";

import { useRouter } from "next/navigation";
import { useTransition, useEffect, useCallback } from "react";
import { PlayerHalf } from "@/components/player-half";
import { CenterBar } from "@/components/center-bar";
import { GameOverDialog } from "@/components/game-over-dialog";
import { addDisc, undoDisc, endRound, undoRound } from "@/lib/actions/rounds";

interface GameData {
  id: number;
  player1Id: number;
  player2Id: number;
  player1Score: number;
  player2Score: number;
  winnerId: number | null;
  status: string;
  player1: { id: number; name: string };
  player2: { id: number; name: string };
  winner: { id: number; name: string } | null;
  rounds: Array<{
    id: number;
    roundNumber: number;
    hammerPlayerId: number;
    status: string;
    discs: Array<{
      id: number;
      playerId: number;
      ringValue: number;
    }>;
  }>;
}

interface GameClientProps {
  game: GameData;
}

export function GameClient({ game }: GameClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;

    async function acquire() {
      try {
        if ("wakeLock" in navigator) {
          if (wakeLock) { try { await wakeLock.release(); } catch {} }
          wakeLock = await navigator.wakeLock.request("screen");
        }
      } catch {}
    }

    acquire();

    function onVisibility() {
      if (document.visibilityState === "visible") {
        acquire();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    interval = setInterval(acquire, 30_000);

    return () => {
      if (wakeLock) { try { wakeLock.release(); } catch {} }
      if (interval) clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const currentRound = game.rounds.find((r) => r.status === "in_progress");
  const isGameOver = game.status === "completed";
  const completedRoundCount = game.rounds.filter((r) => r.status === "completed").length;

  const player1RoundScore = currentRound
    ? currentRound.discs
        .filter((d) => d.playerId === game.player1Id)
        .reduce((sum, d) => sum + d.ringValue, 0)
    : 0;

  const player2RoundScore = currentRound
    ? currentRound.discs
        .filter((d) => d.playerId === game.player2Id)
        .reduce((sum, d) => sum + d.ringValue, 0)
    : 0;

  const p1Total = game.player1Score + player1RoundScore;
  const p2Total = game.player2Score + player2RoundScore;
  const leader: "p1" | "p2" | "tied" =
    p1Total > p2Total ? "p1" : p2Total > p1Total ? "p2" : "tied";

  const handleDiscTap = useCallback((playerId: number, ringValue: number) => {
    addDisc(game.id, playerId, ringValue).then(() => {
      router.refresh();
    });
  }, [game.id, router]);

  function handleUndo() {
    startTransition(async () => {
      await undoDisc(game.id);
      router.refresh();
    });
  }

  function handleEndRound() {
    startTransition(async () => {
      await endRound(game.id);
      router.refresh();
    });
  }

  function handleUndoRound() {
    startTransition(async () => {
      await undoRound(game.id);
      router.refresh();
    });
  }

  return (
    <div className="h-dvh flex flex-col bg-background overflow-hidden select-none"
         style={{ touchAction: "manipulation" }}>
      <div className={`flex-1 flex transition-colors duration-300 ${
        leader === "p1"
          ? "bg-gradient-to-b from-blue-900/60 to-blue-950/20"
          : "bg-gradient-to-b from-blue-950/30 to-background"
      }`}>
        <PlayerHalf
          name={game.player1.name}
          gameScore={game.player1Score}
          roundScore={player1RoundScore}
          hasHammer={currentRound?.hammerPlayerId === game.player1Id}
          isLeading={leader === "p1"}
          isRotated={true}
          onDiscTap={(v) => handleDiscTap(game.player1Id, v)}
          disabled={isGameOver}
        />
      </div>

      <CenterBar
        roundNumber={currentRound?.roundNumber ?? game.rounds.length}
        player1Name={game.player1.name}
        player2Name={game.player2.name}
        player1Total={p1Total}
        player2Total={p2Total}
        onEndRound={handleEndRound}
        onUndo={handleUndo}
        onUndoRound={handleUndoRound}
        canUndoRound={completedRoundCount > 0}
        disabled={isPending || isGameOver}
      />

      <div className={`flex-1 flex transition-colors duration-300 ${
        leader === "p2"
          ? "bg-gradient-to-t from-red-900/60 to-red-950/20"
          : "bg-gradient-to-t from-red-950/30 to-background"
      }`}>
        <PlayerHalf
          name={game.player2.name}
          gameScore={game.player2Score}
          roundScore={player2RoundScore}
          hasHammer={currentRound?.hammerPlayerId === game.player2Id}
          isLeading={leader === "p2"}
          isRotated={false}
          onDiscTap={(v) => handleDiscTap(game.player2Id, v)}
          disabled={isGameOver}
        />
      </div>

      <GameOverDialog
        open={isGameOver}
        winnerName={game.winner?.name ?? ""}
        player1Name={game.player1.name}
        player1Score={game.player1Score}
        player2Name={game.player2.name}
        player2Score={game.player2Score}
        player1Id={game.player1Id}
        player2Id={game.player2Id}
      />
    </div>
  );
}
