"use client";

interface TwentiesDisc {
  id: number;
}

interface TwentiesTrayProps {
  discs: TwentiesDisc[];
  onAdd: () => void;
  onRemove: (discId: number) => void;
  disabled?: boolean;
  isPlayer1?: boolean;
}

export function TwentiesTray({
  discs,
  onAdd,
  onRemove,
  disabled = false,
  isPlayer1 = false,
}: TwentiesTrayProps) {
  const discColor = isPlayer1
    ? "radial-gradient(circle at 40% 35%, #c8a862, #b09050)"
    : "radial-gradient(circle at 40% 35%, #4a4440, #2a2420)";

  return (
    <div className="flex items-center gap-1">
      <span
        className="text-[8px] uppercase tracking-wider"
        style={{ color: "var(--text-dim, #8a8078)" }}
      >
        20s
      </span>
      <div className="flex items-center gap-[3px]">
        {discs.map((disc) => (
          <button
            key={disc.id}
            onClick={() => !disabled && onRemove(disc.id)}
            disabled={disabled}
            className="w-4 h-4 rounded-full border-0 p-0 cursor-pointer disabled:cursor-not-allowed"
            style={{
              background: discColor,
              boxShadow: "0 1px 2px rgba(0,0,0,0.4)",
            }}
            aria-label="Remove 20-point disc"
          />
        ))}
        {/* "+" button to add a 20 */}
        <button
          onClick={() => !disabled && onAdd()}
          disabled={disabled}
          className="w-5 h-5 rounded-full flex items-center justify-center border p-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            borderColor: "var(--text-dim, #3d362e)",
            background: "transparent",
            color: "var(--text-dim, #8a8078)",
            fontSize: "12px",
            lineHeight: 1,
          }}
          aria-label="Add 20-point disc"
        >
          +
        </button>
      </div>
    </div>
  );
}
