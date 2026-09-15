import { cn } from "@xenior/ui";

/** Official Planio SVG wordmark — do not redraw as text. */
export function PlanioLogo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- official SVG wordmark must render exactly
    <img
      src="/planio-logo.svg"
      alt="Planio"
      width={448}
      height={194}
      className={cn("h-8 w-auto", className)}
      decoding="async"
    />
  );
}
