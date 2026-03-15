"use client";

import { useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createGame } from "@/lib/actions/games";
import Link from "next/link";

interface Player {
  id: number;
  name: string;
}

interface NewGameClientProps {
  players: Player[];
  recentPlayers: Player[];
  defaultPlayer1Id?: number;
  defaultPlayer2Id?: number;
}

export function NewGameClient({
  players,
  recentPlayers,
  defaultPlayer1Id,
  defaultPlayer2Id,
}: NewGameClientProps) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);

  // Resolve defaults from props
  const defaultP1 = defaultPlayer1Id
    ? players.find((p) => p.id === defaultPlayer1Id) ?? null
    : null;
  const defaultP2 = defaultPlayer2Id
    ? players.find((p) => p.id === defaultPlayer2Id) ?? null
    : null;

  const [player1, setPlayer1] = useState<Player | null>(defaultP1);
  const [player2, setPlayer2] = useState<Player | null>(defaultP2);
  const [searchQuery, setSearchQuery] = useState("");
  const [step, setStep] = useState<"select" | "confirm">(
    defaultP1 && defaultP2 ? "confirm" : "select"
  );
  const [hammer, setHammer] = useState<"random" | "player1" | "player2">("random");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter chips: exclude already-selected players
  const visibleChips = recentPlayers.filter(
    (p) => p.id !== player1?.id && p.id !== player2?.id
  );

  // Filter search results: substring match, exclude selected players
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return players.filter(
      (p) =>
        p.name.toLowerCase().includes(query) &&
        p.id !== player1?.id &&
        p.id !== player2?.id
    );
  }, [searchQuery, players, player1, player2]);

  function selectPlayer(player: Player) {
    // Blur search to dismiss mobile keyboard
    searchRef.current?.blur();
    setSearchQuery("");

    if (!player1) {
      setPlayer1(player);
      // If the other slot is already filled, auto-advance
      if (player2) {
        setStep("confirm");
      }
    } else if (!player2) {
      setPlayer2(player);
      setStep("confirm");
    }
  }

  function deselectPlayer(slot: "player1" | "player2") {
    if (slot === "player1") {
      setPlayer1(null);
    } else {
      setPlayer2(null);
    }
    setStep("select");
    setHammer("random");
  }

  function handleBack() {
    setPlayer2(null);
    setStep("select");
    setHammer("random");
  }

  async function handleStartGame() {
    if (!player1 || !player2) return;
    setIsSubmitting(true);
    try {
      let hammerPlayerId: number;
      if (hammer === "random") {
        hammerPlayerId = Math.random() < 0.5 ? player1.id : player2.id;
      } else if (hammer === "player1") {
        hammerPlayerId = player1.id;
      } else {
        hammerPlayerId = player2.id;
      }
      const game = await createGame(player1.id, player2.id, hammerPlayerId);
      router.push(`/game/${game.id}`);
    } catch {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">New Game</h1>
        {step === "confirm" ? (
          <button
            onClick={handleBack}
            className="text-sm text-[--text-dim]"
          >
            Back
          </button>
        ) : (
          <Link href="/">
            <Button variant="ghost" size="sm">Back</Button>
          </Link>
        )}
      </div>

      {/* Matchup Hero Card */}
      <div
        className="rounded-xl border border-border mb-6 p-6 text-center"
        style={{
          background: "linear-gradient(180deg, var(--card) 0%, var(--background) 100%)",
        }}
      >
        <div className="flex items-center justify-center gap-4">
          {/* Player 1 */}
          <button
            className="flex-1 text-center"
            onClick={() => player1 && deselectPlayer("player1")}
            disabled={!player1}
          >
            <div
              className="text-[10px] uppercase tracking-widest mb-1"
              style={{ color: player1 ? "var(--lead)" : "var(--text-dim)" }}
            >
              Player 1
            </div>
            {player1 ? (
              <div className="text-xl font-bold">{player1.name}</div>
            ) : (
              <div className="text-lg" style={{ color: "var(--text-dim)" }}>
                select below
              </div>
            )}
          </button>

          {/* VS Divider */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-px h-4" style={{ background: "var(--border)" }} />
            <div
              className="text-xs font-bold tracking-widest"
              style={{ color: "var(--rail-2)" }}
            >
              VS
            </div>
            <div className="w-px h-4" style={{ background: "var(--border)" }} />
          </div>

          {/* Player 2 */}
          <button
            className="flex-1 text-center"
            onClick={() => player2 && deselectPlayer("player2")}
            disabled={!player2}
          >
            <div
              className="text-[10px] uppercase tracking-widest mb-1"
              style={{ color: player2 ? "var(--lead)" : "var(--text-dim)" }}
            >
              Player 2
            </div>
            {player2 ? (
              <div className="text-xl font-bold">{player2.name}</div>
            ) : (
              <div className="text-lg" style={{ color: "var(--text-dim)" }}>
                select below
              </div>
            )}
          </button>
        </div>
      </div>

      {step === "select" && (
        <>
          {/* Recent Chips */}
          {visibleChips.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {visibleChips.map((player) => (
                <button
                  key={player.id}
                  onClick={() => selectPlayer(player)}
                  className="px-4 py-2 rounded-full bg-secondary text-foreground text-sm"
                >
                  {player.name}
                </button>
              ))}
            </div>
          )}

          {/* Search Bar */}
          <div className="relative mb-2">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[--text-dim] text-sm pointer-events-none">
              🔍
            </div>
            <input
              ref={searchRef}
              type="text"
              placeholder="Search all players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-3 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-[--text-dim]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[--text-dim] text-sm"
              >
                ✕
              </button>
            )}
          </div>

          {/* Search Results */}
          {searchQuery.trim() && (
            <div className="border border-border rounded-lg overflow-hidden">
              {searchResults.length === 0 ? (
                <div className="p-3 text-sm text-[--text-dim] text-center">
                  No players found
                </div>
              ) : (
                searchResults.map((player) => (
                  <button
                    key={player.id}
                    onClick={() => selectPlayer(player)}
                    className="w-full text-left px-4 py-3 text-sm border-b border-border last:border-b-0 hover:bg-secondary/50"
                  >
                    {player.name}
                  </button>
                ))
              )}
            </div>
          )}
        </>
      )}

      {step === "confirm" && player1 && player2 && (
        <>
          {/* Hammer Toggle */}
          <div className="mb-6">
            <div
              className="text-[11px] uppercase tracking-wider mb-2"
              style={{ color: "var(--muted-foreground)" }}
            >
              First Hammer
            </div>
            <div className="flex gap-2">
              {(["player1", "random", "player2"] as const).map((option) => {
                const isSelected = hammer === option;
                const label =
                  option === "random"
                    ? "🎲 Random"
                    : option === "player1"
                      ? player1.name
                      : player2.name;
                return (
                  <button
                    key={option}
                    onClick={() => setHammer(option)}
                    className="flex-1 py-2.5 rounded-lg text-sm text-center transition-colors"
                    style={{
                      background: "var(--secondary)",
                      border: isSelected
                        ? "2px solid var(--rail-2)"
                        : "1px solid var(--border)",
                      color: isSelected ? "var(--rail-2)" : "var(--foreground)",
                      fontWeight: isSelected ? 600 : 400,
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Start Game Button */}
          <Button
            onClick={handleStartGame}
            disabled={isSubmitting}
            className="w-full h-14 text-lg font-bold"
            size="lg"
            style={{
              background: "linear-gradient(135deg, var(--rail-2), var(--rail-3))",
              color: "#1a1400",
              border: "none",
              opacity: isSubmitting ? 0.6 : 1,
            }}
          >
            {isSubmitting ? "Starting..." : "Start Game"}
          </Button>
        </>
      )}
    </div>
  );
}
