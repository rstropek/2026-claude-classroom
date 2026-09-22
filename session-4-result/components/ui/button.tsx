import type { ComponentProps } from "react";

const variants = {
  primary: "bg-button text-white hover:bg-button-hover",
  secondary: "border border-edge bg-transparent text-ink hover:bg-raised",
};

/**
 * Graphite, square, weight 600. The brand fills its buttons from the grey ramp
 * and keeps blue for links, so that the one blue thing on a screen is always
 * the thing you navigate to. There is deliberately no blue variant, and no
 * third style: the secondary one is the outlined alternative beside a primary.
 */
export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: keyof typeof variants }) {
  return (
    <button
      className={`${variants[variant]} px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    />
  );
}
