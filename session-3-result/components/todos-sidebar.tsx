"use client";

import { useAgent } from "@copilotkit/react-core/v2";
import { useCallback, useEffect, useState } from "react";
import type { TodoItem } from "@/lib/todo-tools";

/**
 * Read-only by design: the agent is the write path, so this only mirrors what
 * /api/todos reports. `initial` comes from the server render, so the list is
 * there on first paint.
 *
 * Laid out as a forum table rather than a stack of cards: a sentence-case
 * column header over a rule, then rows separated by hairlines with their count
 * in a right-aligned tabular column. The rules are the structure — no row
 * carries a border, a background or a radius of its own.
 */
export function TodosSidebar({
  agentId,
  initial,
}: {
  agentId: string;
  initial: TodoItem[];
}) {
  const [todos, setTodos] = useState(initial);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/todos");
    if (!response.ok) {
      return;
    }
    const body = (await response.json()) as { todos: TodoItem[] };
    setTodos(body.todos);
  }, []);

  // No threadId: CopilotChat itself binds by agentId alone, so this is the
  // very instance it runs rather than a private proxied one. `updates: []`
  // because the state this renders is fetched, not the agent's.
  const { agent, isReady } = useAgent({ agentId, updates: [] });

  useEffect(() => {
    // Until /info resolves, `agent` is a provisional stand-in that is later
    // swapped, taking any subscription on it along.
    if (!isReady) {
      return;
    }

    // A tool result means the ledger may have moved; all three tools are ours
    // and the re-read is one indexed query, so it is not worth filtering by
    // name. onRunFinalized also catches a run that ended without one.
    const subscription = agent.subscribe({
      onToolCallResultEvent: () => {
        void refresh();
      },
      onRunFinalized: () => {
        void refresh();
      },
    });

    return () => subscription.unsubscribe();
  }, [agent, isReady, refresh]);

  const open = todos.filter((todo) => !todo.done).length;

  return (
    // Below `md` a fixed 288px rail leaves the transcript ~90px, so the rail
    // goes rather than the chat. Nothing is lost: every change to the list is
    // also reported in the transcript by a tool-call row.
    <aside className="hidden w-72 shrink-0 flex-col border-l border-edge bg-surface md:flex">
      <div className="flex items-baseline justify-between gap-3 border-b border-edge px-3 py-2">
        <h2 className="text-sm text-ink-mute">Your list</h2>
        {todos.length > 0 ? (
          <span className="tabular-nums text-sm text-ink-mute">
            {open} / {todos.length}
          </span>
        ) : null}
      </div>
      {todos.length === 0 ? (
        <p className="px-3 py-2 text-sm text-ink-soft">
          Nothing on the list yet. Ask Bartholomew to note something down.
        </p>
      ) : (
        <ul className="flex-1 overflow-y-auto">
          {todos.map((todo) => (
            <li
              key={todo.id}
              className={`flex items-baseline gap-2 border-b border-rule px-3 py-2 text-base last:border-b-0 hover:bg-raised ${
                // The strike is what carries "done"; the grey is a second cue.
                todo.done ? "text-ink-mute line-through" : "text-ink"
              }`}
            >
              <span aria-hidden className="shrink-0 text-sm text-ink-mute">
                {todo.done ? "✓" : "○"}
              </span>
              <span className="min-w-0 break-words">{todo.title}</span>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
