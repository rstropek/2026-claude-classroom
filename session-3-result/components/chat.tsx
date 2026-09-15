"use client";

import { CopilotChat, CopilotKit } from "@copilotkit/react-core/v2";
import "@copilotkit/react-core/v2/styles.css";
import { TodoToolCalls } from "@/components/todo-tool-calls";
import { TodosSidebar } from "@/components/todos-sidebar";
import type { TodoItem } from "@/lib/todo-tools";

/**
 * The whole signed-in surface: the provider, the chat, and the sidebar that
 * watches the same run. `threadId` is handed down from the server-rendered
 * session rather than picked here, so a reload rejoins the same Mastra thread
 * instead of starting a new one. See lib/tutor.ts for why a forged one is
 * useless.
 */
export function Chat({
  agentId,
  threadId,
  initialTodos,
}: {
  agentId: string;
  threadId: string;
  initialTodos: TodoItem[];
}) {
  return (
    // The Inspector is on by default in development builds and never loads in a
    // production one, so `enableInspector` is left unset deliberately;
    // `showDevConsole` is deprecated and no longer controls it either way.
    // app/globals.css moves its launcher off the header's sign-out button.
    <CopilotKit runtimeUrl="/api/copilotkit" credentials="include">
      {/* Registers the transcript renderers for the tutor's tools; draws
          nothing itself, but has to be inside the provider. */}
      <TodoToolCalls />
      {/* Sized by flex the whole way down — every child stretches to the row's
          height, so nothing depends on a percentage resolving. */}
      <div className="flex min-h-0 flex-1">
        {/* The column fills the viewport; the transcript inside it is held to a
            reading measure and sits on a white panel, so the blue-grey ground
            stays visible down both sides. */}
        <div className="flex min-w-0 flex-1 justify-center overflow-hidden">
          <CopilotChat
            agentId={agentId}
            threadId={threadId}
            className="h-full w-full max-w-3xl border-x border-edge bg-surface"
            labels={{
              chatInputPlaceholder: "Add something to the list…",
            }}
          />
        </div>
        {/* Inside the provider, and on the chat's own agentId, so it watches
            that run rather than opening a second one. */}
        <TodosSidebar agentId={agentId} initial={initialTodos} />
      </div>
    </CopilotKit>
  );
}
