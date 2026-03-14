"use client";

interface RingButtonProps {
  value: number;
  onClick: () => void;
  disabled?: boolean;
}

const RING_COLORS: Record<number, string> = {
  20: "bg-[#ffd700] text-black hover:bg-[#e6c200]",
  15: "bg-[#c0392b] text-white hover:bg-[#a93226]",
  10: "bg-[#2980b9] text-white hover:bg-[#2471a3]",
  5: "bg-[#27ae60] text-white hover:bg-[#229954]",
};

export function RingButton({ value, onClick, disabled }: RingButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-14 h-14 rounded-full font-bold text-lg
        transition-transform active:scale-90
        ${RING_COLORS[value] || "bg-gray-500 text-white"}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      {value}
    </button>
  );
}
