interface StatCardProps {
  label: string;
  value: string | number;
  variant?: "positive" | "negative" | "neutral";
}

const variantColors: Record<string, string> = {
  positive: "#7a9e80",
  negative: "#8e5548",
  neutral: "var(--foreground)",
};

export function StatCard({ label, value, variant = "neutral" }: StatCardProps) {
  return (
    <div className="bg-muted/50 rounded-lg p-4 text-center">
      <div
        className="text-2xl font-bold"
        style={{ color: variantColors[variant] }}
      >
        {value}
      </div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
        {label}
      </div>
    </div>
  );
}
