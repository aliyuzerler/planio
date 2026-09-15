import type { ReactNode } from "react";
import { cn } from "@xenior/ui";

const WIDTHS = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-7xl",
} as const;

export function PageFrame({
  children,
  width = "md",
  className,
}: {
  children: ReactNode;
  width?: keyof typeof WIDTHS;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full p-6 sm:p-8", WIDTHS[width], className)}>
      {children}
    </div>
  );
}
