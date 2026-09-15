import type { ReactNode } from "react";

/**
 * The app bar every signed-in page sits under: title left, actions right.
 *
 * The title stays at body size rather than growing into a heading — this is
 * chrome, and it must not out-shout the transcript beneath it.
 */
export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
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
      {children}
    </header>
  );
}
