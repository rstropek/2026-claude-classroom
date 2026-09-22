import type { ReactNode } from "react";

/**
 * One agent tool call as it appears in the chat transcript: a quiet row that
 * says what the tutor did to the list, not how it did it.
 *
 * The 2px left rule is this system's signature — it marks "the agent touched
 * the ledger here", the way the forum marks a thread you follow. Blue while
 * the call runs, so a running call is the only blue thing in the transcript,
 * then grey once it settles. The verb states the state in words too, so the
 * colour is a second channel rather than the only one.
 */
export function ToolCall({
  state,
  verb,
  detail,
}: {
  state: "running" | "done";
  verb: string;
  detail?: ReactNode;
}) {
  return (
    <div
      className={`my-1.5 flex max-w-fit items-center gap-2 border-l-2 bg-raised px-2.5 py-1.5 text-sm ${
        state === "running" ? "border-accent" : "border-grey-300"
      }`}
    >
      {state === "running" ? (
        <span
          aria-hidden
          className="size-3 shrink-0 animate-spin rounded-full border border-edge border-t-accent motion-reduce:animate-none"
        />
      ) : (
        <span aria-hidden className="shrink-0 text-ink-mute">
          ✓
        </span>
      )}
      <span className="font-semibold text-ink">{verb}</span>
      {detail ? (
        <span className="min-w-0 truncate text-ink-soft">{detail}</span>
      ) : null}
    </div>
  );
}
