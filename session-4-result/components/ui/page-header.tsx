import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The app bar every signed-in page sits under: title left, then the route
 * links and the actions on the right.
 *
 * The title stays at body size rather than growing into a heading — this is
 * chrome, and it must not out-shout the transcript beneath it.
 */
export function PageHeader({
  title,
  subtitle,
  nav,
  children,
}: {
  title: string;
  subtitle?: string;
  nav?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-edge bg-surface px-6 py-3">
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-base font-semibold text-ink">
          {title}
        </span>
        {subtitle ? (
          <span className="truncate text-sm text-ink-soft">{subtitle}</span>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-4">
        {nav ? <nav className="flex items-center gap-4">{nav}</nav> : null}
        {children}
      </div>
    </header>
  );
}

/** A route link for the header's `nav`: blue is what you navigate to. */
export function HeaderLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-sm font-semibold text-accent hover:underline"
    >
      {children}
    </Link>
  );
}
