"use client";

interface CenterBarProps {
  player1Score: number;
  player2Score: number;
  onMenuOpen: () => void;
}

export function CenterBar({
  player1Score,
  player2Score,
  onMenuOpen,
}: CenterBarProps) {
  const p1Width = Math.min(player1Score, 100) / 2;
  const p2Width = Math.min(player2Score, 100) / 2;

  // Adaptive text: use dark text when score >= 15 (enough fill behind), light otherwise
  const p1TextColor = player1Score >= 15 ? "#1a1400" : "#ddd8d0";
  const p1MutedColor = player1Score >= 15 ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)";
  const p1DashColor = player1Score >= 15 ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.3)";

  // P2 fill is steel (dark) — light text always works
  const p2TextColor = "#ddd8d0";
  const p2MutedColor = "rgba(255,255,255,0.5)";
  const p2DashColor = "rgba(255,255,255,0.3)";

  return (
    <div className="shrink-0" style={{ padding: "4px 6px", background: "var(--surface-deep)" }}>
      <div
        style={{
          position: "relative",
          height: 28,
          background: "rgba(255,255,255,0.04)",
          borderRadius: 14,
          overflow: "visible",
        }}
      >
        {/* P1 fill (gold, from left) */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: `${p1Width}%`,
            background: "linear-gradient(90deg, #c8a862, rgba(200,168,98,0.4))",
            borderRadius: "14px 0 0 14px",
            transition: "width 0.3s ease",
          }}
        />

        {/* P2 fill (steel, from right) */}
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: `${p2Width}%`,
            background: "linear-gradient(270deg, #6a7580, rgba(106,117,128,0.4))",
            borderRadius: "0 14px 14px 0",
            transition: "width 0.3s ease",
          }}
        />

        {/* P1 scores (rotated 180° for P1, on left end of bar) */}
        <div
          style={{
            position: "absolute",
            left: 6,
            top: "50%",
            transform: "translateY(-50%) rotate(180deg)",
            display: "flex",
            alignItems: "center",
            gap: 2,
            zIndex: 2,
          }}
        >
          <span style={{ fontSize: 11, fontWeight: "bold", color: p1TextColor, textShadow: player1Score < 15 ? "0 1px 3px rgba(0,0,0,0.8)" : "none" }}>
            {player1Score}
          </span>
          <span style={{ fontSize: 8, color: p1DashColor }}>-</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: p1MutedColor, textShadow: player1Score < 15 ? "0 1px 3px rgba(0,0,0,0.8)" : "none" }}>
            {player2Score}
          </span>
        </div>

        {/* Menu dot (center) */}
        <button
          onClick={onMenuOpen}
          aria-label="Game menu"
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 3,
            width: 22,
            height: 22,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            background: "rgba(18,16,14,0.85)",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="#8a8078">
            <circle cx="12" cy="5" r="2.5" />
            <circle cx="12" cy="12" r="2.5" />
            <circle cx="12" cy="19" r="2.5" />
          </svg>
        </button>

        {/* P2 scores (normal for P2) */}
        <div
          style={{
            position: "absolute",
            right: 6,
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            alignItems: "center",
            gap: 2,
            zIndex: 2,
          }}
        >
          <span style={{ fontSize: 11, fontWeight: "bold", color: p2TextColor, textShadow: player2Score < 15 ? "0 1px 3px rgba(0,0,0,0.8)" : "none" }}>
            {player2Score}
          </span>
          <span style={{ fontSize: 8, color: p2DashColor }}>-</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: p2MutedColor, textShadow: player2Score < 15 ? "0 1px 3px rgba(0,0,0,0.8)" : "none" }}>
            {player1Score}
          </span>
        </div>

        {/* Center line */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 3,
            bottom: 3,
            width: 1,
            background: "rgba(255,255,255,0.12)",
          }}
        />
      </div>
    </div>
  );
}
