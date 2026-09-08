import type { ComponentProps, ReactNode } from "react";

type AuthCardProps = ComponentProps<"form"> & {
  title: string;
  footer: ReactNode;
};

/** Centred panel shared by /signup and /login; children are the fields. */
export function AuthCard({
  title,
  footer,
  children,
  className = "",
  ...props
}: AuthCardProps) {
  return (
    <main className="flex flex-1 items-center justify-center bg-ground px-6 py-16">
      {/*
       * Square panel on the ground — no radius, no shadow. The auth screens are
       * the only place a 24px heading is right, because the form is the whole
       * page and nothing competes with it.
       */}
      <form
        className={`flex w-full max-w-sm flex-col gap-5 border border-edge bg-surface p-8 ${className}`}
        {...props}
      >
        <h1 className="text-2xl font-semibold text-ink">{title}</h1>
        {children}
        <p className="text-sm text-ink-soft">{footer}</p>
      </form>
    </main>
  );
}
