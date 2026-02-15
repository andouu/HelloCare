type SpinnerSize = "sm" | "md" | "lg";
type SpinnerTheme = "neutral" | "amber" | "blue" | "emerald" | "rose";

const sizeClasses: Record<SpinnerSize, string> = {
  sm: "w-4 h-4 border-2",
  md: "w-6 h-6 border-2",
  lg: "w-8 h-8 border-[4px]",
};

const themeClasses: Record<SpinnerTheme, string> = {
  neutral: "border-neutral-300/40 border-t-neutral-900",
  amber: "border-white/30 border-t-white",
  blue: "border-white/30 border-t-white",
  emerald: "border-white/30 border-t-white",
  rose: "border-white/30 border-t-white",
};

interface SpinnerProps {
  size?: SpinnerSize;
  theme?: SpinnerTheme;
}

export function Spinner({ size = "md", theme = "neutral" }: SpinnerProps) {
  return (
    <div
      className={`rounded-full animate-spin ${sizeClasses[size]} ${themeClasses[theme]}`}
      role="status"
      aria-label="Loading"
    />
  );
}
