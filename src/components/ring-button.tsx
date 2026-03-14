"use client";

import { useCallback, useRef } from "react";

interface RingButtonProps {
  value: number;
  onTap: () => void;
  disabled?: boolean;
}

const RING_COLORS: Record<number, string> = {
  20: "bg-[#ffd700] text-black shadow-[0_0_12px_rgba(255,215,0,0.4)]",
  15: "bg-[#c0392b] text-white shadow-[0_0_12px_rgba(192,57,43,0.4)]",
  10: "bg-[#2980b9] text-white shadow-[0_0_12px_rgba(41,128,185,0.4)]",
  5: "bg-[#27ae60] text-white shadow-[0_0_12px_rgba(39,174,96,0.4)]",
};

export function RingButton({ value, onTap, disabled }: RingButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();

    const el = ref.current;
    if (el) {
      el.classList.add("scale-75", "brightness-150");
      setTimeout(() => {
        el.classList.remove("scale-75", "brightness-150");
      }, 150);
    }

    onTap();
  }, [disabled, onTap]);

  const handlePointerCancel = useCallback(() => {
    ref.current?.classList.remove("scale-75", "brightness-150");
  }, []);

  return (
    <button
      ref={ref}
      onPointerDown={handlePointerDown}
      onPointerCancel={handlePointerCancel}
      disabled={disabled}
      style={{ touchAction: "manipulation" }}
      aria-label={`Score ${value} points`}
      className={`
        w-20 h-20 rounded-full font-bold text-2xl select-none
        transition-all duration-150
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring
        ${RING_COLORS[value] || "bg-gray-500 text-white"}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      {value}
    </button>
  );
}
