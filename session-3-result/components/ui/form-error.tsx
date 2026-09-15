/** Renders nothing until there is a message, so callers can pass state directly. */
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  // The left rule carries the alarm; the tint alone would be colour-only state.
  return (
    <p
      role="alert"
      className="border-l-2 border-danger bg-danger-surface px-3 py-2 text-sm text-danger"
    >
      {message}
    </p>
  );
}
