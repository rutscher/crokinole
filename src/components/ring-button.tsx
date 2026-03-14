"use client";

import { useCallback, useRef } from "react";

interface RingButtonProps {
  value: number;
  onTap: () => void;
  disabled?: boolean;
}

const RING_STYLES: Record<number, { background: string; color: string; boxShadow: string }> = {
  5: {
    background: "radial-gradient(circle at 40% 32%, #5a7560, #486050 50%, #3a5040)",
    color: "#ddd8d0",
    boxShadow: "0 3px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.12)",
  },
  10: {
    background: "radial-gradient(circle at 40% 32%, #6a7580, #556570 50%, #485860)",
    color: "#ddd8d0",
    boxShadow: "0 3px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.12)",
  },
  15: {
    background: "radial-gradient(circle at 40% 32%, #8e5548, #7a4438 50%, #663830)",
    color: "#ddd8d0",
    boxShadow: "0 3px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.12)",
  },
  20: {
    background: "radial-gradient(circle at 40% 32%, #c8a862, #b09050 50%, #958040)",
    color: "#1a1400",
    boxShadow: "0 3px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
  },
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

  const ringStyle = RING_STYLES[value] || { background: "#555", color: "#fff", boxShadow: "none" };

  return (
    <button
      ref={ref}
      onPointerDown={handlePointerDown}
      onPointerCancel={handlePointerCancel}
      disabled={disabled}
      style={{
        touchAction: "manipulation",
        ...ringStyle,
      }}
      aria-label={`Score ${value} points`}
      className={`
        w-20 h-20 rounded-full font-bold text-2xl select-none
        transition-all duration-150
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      {value}
    </button>
  );
}
