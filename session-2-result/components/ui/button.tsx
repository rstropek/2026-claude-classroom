import type { ComponentProps } from "react";

/**
 * Graphite, square, weight 600. The brand fills its buttons from the grey ramp
 * and keeps blue for links, so that the one blue thing on a screen is always
 * the thing you navigate to. There is deliberately no blue variant.
 */
export function Button({ className = "", ...props }: ComponentProps<"button">) {
  return (
    <button
      className={`bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    />
  );
}
