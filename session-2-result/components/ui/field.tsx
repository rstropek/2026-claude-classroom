import type { ComponentProps } from "react";

type FieldProps = ComponentProps<"input"> & { label: string };

/** A labelled text input; `id` doubles as the field's `name`. */
export function Field({ label, id, className = "", ...props }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink-soft">
        {label}
      </label>
      {/* outline-offset-0 so the focus ring hugs the square field. */}
      <input
        id={id}
        name={id}
        className={`border border-edge bg-surface px-3 py-2 text-base text-ink placeholder:text-ink-mute focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent ${className}`}
        {...props}
      />
    </div>
  );
}
