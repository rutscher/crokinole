interface WoodRailProps {
  height?: number;
}

export function WoodRail({ height = 7 }: WoodRailProps) {
  return (
    <div
      className="w-full relative shrink-0"
      style={{
        height: `${height}px`,
        background: "linear-gradient(90deg, var(--rail-1), var(--rail-2), var(--rail-3), var(--rail-4), var(--rail-1))",
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.1), transparent)",
        }}
      />
    </div>
  );
}
