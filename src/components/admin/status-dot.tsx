import { cn } from "@/lib/utils";

const variants = {
  urgent: "bg-red-400",
  active: "bg-amber-400",
  blocked: "bg-orange-400",
  scheduled: "bg-blue-400",
  complete: "bg-emerald-400",
  neutral: "bg-zinc-400",
} as const;

interface StatusDotProps {
  variant: keyof typeof variants;
  pulse?: boolean;
  className?: string;
}

export function StatusDot({ variant, pulse, className }: StatusDotProps) {
  return (
    <span className={cn("relative flex h-2 w-2 shrink-0", className)}>
      {pulse && (
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
            variants[variant]
          )}
        />
      )}
      <span
        className={cn(
          "relative inline-flex h-2 w-2 rounded-full",
          variants[variant]
        )}
      />
    </span>
  );
}
