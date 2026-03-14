"use client";

import { useRouter } from "next/navigation";
import { useTransition, useEffect, useCallback, useState, useRef } from "react";
import { PlayerHalf } from "@/components/player-half";
import { CenterBar } from "@/components/center-bar";
import { WoodRail } from "@/components/wood-rail";
import { GameOverDialog } from "@/components/game-over-dialog";
import { RoundSummaryDialog } from "@/components/round-summary-dialog";
import { ExitMenuDialog } from "@/components/exit-menu-dialog";
import { addDisc, undoDisc, endRound, undoRound } from "@/lib/actions/rounds";

interface Disc {
  id: number;
  playerId: number;
  ringValue: number;
}

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
    player1RoundScore: number;
    player2RoundScore: number;
    pointsAwarded: number;
    awardedToPlayerId: number | null;
    discs: Disc[];
  }>;
}

interface GameClientProps {
  game: GameData;
}

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

export function GameClient({ game }: GameClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [localDiscs, setLocalDiscs] = useState<Disc[]>([]);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [showExitMenu, setShowExitMenu] = useState(false);
  const nextLocalId = useRef(-1);

  // Sync local discs from server state when game data changes
  useEffect(() => {
    const currentRound = game.rounds.find((r) => r.status === "in_progress");
    setLocalDiscs(currentRound?.discs ?? []);
  }, [game]);

  // Wake lock
  useEffect(() => {
    let noSleepInstance: { enable: () => void; disable: () => void } | null = null;
    let wakeLock: WakeLockSentinel | null = null;
    let activated = false;

    async function activate() {
      if (activated) return;
      activated = true;
      const NoSleep = (await import("nosleep.js")).default;
      noSleepInstance = new NoSleep();
      noSleepInstance.enable();
      try {
        if ("wakeLock" in navigator) {
          wakeLock = await navigator.wakeLock.request("screen");
        }
      } catch {}
    }

    function onInteraction() {
      activate();
    }
    document.addEventListener("pointerdown", onInteraction, { once: true });
    document.addEventListener("touchstart", onInteraction, { once: true });

    function onVisibility() {
      if (document.visibilityState === "visible" && activated) {
        noSleepInstance?.enable();
        navigator.wakeLock?.request("screen").then((wl) => { wakeLock = wl; }).catch(() => {});
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      noSleepInstance?.disable();
      if (wakeLock) { try { wakeLock.release(); } catch {} }
      document.removeEventListener("pointerdown", onInteraction);
      document.removeEventListener("touchstart", onInteraction);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const currentRound = game.rounds.find((r) => r.status === "in_progress");
  const isGameOver = game.status === "completed";
  const completedRoundCount = game.rounds.filter((r) => r.status === "completed").length;

  // Use local discs for scores (optimistic)
  const player1RoundScore = localDiscs
    .filter((d) => d.playerId === game.player1Id)
    .reduce((sum, d) => sum + d.ringValue, 0);

  const player2RoundScore = localDiscs
    .filter((d) => d.playerId === game.player2Id)
    .reduce((sum, d) => sum + d.ringValue, 0);

  const p1Total = game.player1Score + player1RoundScore;
  const p2Total = game.player2Score + player2RoundScore;
  const leader: "p1" | "p2" | "tied" =
    p1Total > p2Total ? "p1" : p2Total > p1Total ? "p2" : "tied";

  // Optimistic disc tap — update UI instantly, sync with server
  const handleDiscTap = useCallback((playerId: number, ringValue: number) => {
    const tempId = nextLocalId.current--;
    setLocalDiscs((prev) => [...prev, { id: tempId, playerId, ringValue }]);
    addDisc(game.id, playerId, ringValue).catch(() => {
      // Revert on failure
      setLocalDiscs((prev) => prev.filter((d) => d.id !== tempId));
    });
  }, [game.id]);

  // Optimistic undo — remove from local state instantly
  const handleUndo = useCallback((playerId: number) => {
    setLocalDiscs((prev) => {
      const idx = [...prev].reverse().findIndex((d) => d.playerId === playerId);
      if (idx === -1) return prev;
      const actualIdx = prev.length - 1 - idx;
      return prev.filter((_, i) => i !== actualIdx);
    });
    undoDisc(game.id, playerId).catch(() => {
      // On failure, refresh to get true state
      router.refresh();
    });
  }, [game.id, router]);

  // End round — show summary, then advance
  function handleEndRound() {
    // Capture current round scores for the summary
    const p1Rs = player1RoundScore;
    const p2Rs = player2RoundScore;
    const diff = Math.abs(p1Rs - p2Rs);
    const winnerName = p1Rs > p2Rs ? game.player1.name
      : p2Rs > p1Rs ? game.player2.name
      : null;

    startTransition(async () => {
      await endRound(game.id);

      // Show round summary
      setRoundResult({
        roundNumber: currentRound?.roundNumber ?? 1,
        player1Name: game.player1.name,
        player2Name: game.player2.name,
        player1RoundScore: p1Rs,
        player2RoundScore: p2Rs,
        pointsAwarded: diff,
        winnerName,
        newPlayer1Score: game.player1Score + (p1Rs > p2Rs ? diff : 0),
        newPlayer2Score: game.player2Score + (p2Rs > p1Rs ? diff : 0),
      });
    });
  }

  function handleDismissRoundResult() {
    setRoundResult(null);
    router.refresh();
  }

  function handleUndoRound() {
    startTransition(async () => {
      await undoRound(game.id);
      router.refresh();
    });
  }

  return (
    <div className="h-dvh flex flex-col bg-background overflow-hidden select-none"
         style={{ touchAction: "manipulation", overscrollBehavior: "none" }}>
      {/* Player 1 (top, rotated 180deg) */}
      <WoodRail height={7} />
      <div className="flex-1 flex relative overflow-hidden">
        {/* Inner shadow from rail */}
        <div className="absolute top-0 left-0 right-0 h-3 z-10 pointer-events-none"
          style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.3), transparent)" }} />
        {/* Vignette */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.15) 100%)" }} />
        <PlayerHalf
          name={game.player1.name}
          gameScore={game.player1Score}
          roundScore={player1RoundScore}
          hasHammer={currentRound?.hammerPlayerId === game.player1Id}
          isLeading={leader === "p1"}
          isRotated={true}
          onDiscTap={(v) => handleDiscTap(game.player1Id, v)}
          onUndo={() => handleUndo(game.player1Id)}
          disabled={isGameOver || isPending}
        />
      </div>

      {/* Center bar */}
      <WoodRail height={1} />
      <CenterBar
        roundNumber={currentRound?.roundNumber ?? game.rounds.length}
        player1Name={game.player1.name}
        player2Name={game.player2.name}
        player1Total={p1Total}
        player2Total={p2Total}
        onEndRound={handleEndRound}
        onUndoRound={handleUndoRound}
        onMenuOpen={() => setShowExitMenu(true)}
        canUndoRound={completedRoundCount > 0}
        disabled={isPending || isGameOver}
      />
      <WoodRail height={1} />

      {/* Player 2 (bottom, normal orientation) */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Vignette */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.15) 100%)" }} />
        {/* Inner shadow from bottom rail */}
        <div className="absolute bottom-0 left-0 right-0 h-3 z-10 pointer-events-none"
          style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.3), transparent)" }} />
        <PlayerHalf
          name={game.player2.name}
          gameScore={game.player2Score}
          roundScore={player2RoundScore}
          hasHammer={currentRound?.hammerPlayerId === game.player2Id}
          isLeading={leader === "p2"}
          isRotated={false}
          onDiscTap={(v) => handleDiscTap(game.player2Id, v)}
          onUndo={() => handleUndo(game.player2Id)}
          disabled={isGameOver || isPending}
        />
      </div>
      <WoodRail height={7} />

      {/* Round summary dialog */}
      <RoundSummaryDialog
        result={roundResult}
        onDismiss={handleDismissRoundResult}
      />

      {/* Exit menu */}
      <ExitMenuDialog
        open={showExitMenu}
        onClose={() => setShowExitMenu(false)}
        gameId={game.id}
      />

      {/* Game over dialog */}
      <GameOverDialog
        open={isGameOver && !roundResult}
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
