"use client";

import { useState } from "react";

interface RingButtonProps {
  value: number;
  onClick: () => void;
  disabled?: boolean;
}

const RING_COLORS: Record<number, string> = {
  20: "bg-[#ffd700] text-black shadow-[0_0_12px_rgba(255,215,0,0.4)]",
  15: "bg-[#c0392b] text-white shadow-[0_0_12px_rgba(192,57,43,0.4)]",
  10: "bg-[#2980b9] text-white shadow-[0_0_12px_rgba(41,128,185,0.4)]",
  5: "bg-[#27ae60] text-white shadow-[0_0_12px_rgba(39,174,96,0.4)]",
};

export function RingButton({ value, onClick, disabled }: RingButtonProps) {
  const [tapped, setTapped] = useState(false);

  function handleTap() {
    if (disabled) return;
    setTapped(true);
    onClick();
    setTimeout(() => setTapped(false), 150);
  }

  return (
    <button
      onClick={handleTap}
      disabled={disabled}
      className={`
        w-20 h-20 rounded-full font-bold text-2xl
        transition-all duration-150
        ${tapped ? "scale-75 brightness-150" : "active:scale-90"}
        ${RING_COLORS[value] || "bg-gray-500 text-white"}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      {value}
    </button>
  );
}
