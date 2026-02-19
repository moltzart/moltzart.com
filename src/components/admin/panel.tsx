import { cn } from "@/lib/utils";
import * as React from "react";

export function Panel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-lg border border-zinc-700/50 bg-zinc-800/60", className)}
      {...props}
    />
  );
}
