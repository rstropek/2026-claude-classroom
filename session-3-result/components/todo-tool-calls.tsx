"use client";

import { useRenderTool } from "@copilotkit/react-core/v2";
import { z } from "zod";
import { ToolCall } from "@/components/ui/tool-call";
import { parseToolResult } from "@/lib/tool-result";

const todoShape = z.object({
  id: z.string(),
  title: z.string(),
  done: z.boolean(),
});

const listResult = z.object({ todos: z.array(todoShape) });
const addResult = z.object({ todo: todoShape });
const setResult = z.object({ todo: todoShape.nullable() });

/**
 * Renders the tutor's three tools into the chat transcript, so a reader sees
 * the list being read and written rather than only the reply that follows.
 * Registration is a hook, so this must sit inside the CopilotKit provider; it
 * draws nothing of its own.
 */
export function TodoToolCalls() {
  useRenderTool({
    name: "listTodos",
    parameters: z.object({}),
    render: ({ status, result }) => {
      if (status !== "complete") {
        return <ToolCall state="running" verb="Consulting the list" />;
      }

      const parsed = listResult.safeParse(parseToolResult(result));
      const count = parsed.success ? parsed.data.todos.length : null;

      return (
        <ToolCall
          state="done"
          verb="Consulted the list"
          detail={
            count === null
              ? undefined
              : count === 1
                ? "1 item"
                : `${count} items`
          }
        />
      );
    },
  });

  useRenderTool({
    name: "addTodo",
    parameters: z.object({ title: z.string() }),
    render: ({ status, parameters, result }) => {
      // `parameters` is partial while the arguments are still streaming in.
      if (status !== "complete") {
        return (
          <ToolCall
            state="running"
            verb="Writing to the list"
            detail={parameters.title}
          />
        );
      }

      const parsed = addResult.safeParse(parseToolResult(result));

      return (
        <ToolCall
          state="done"
          verb="Added"
          detail={parsed.success ? parsed.data.todo.title : parameters.title}
        />
      );
    },
  });

  useRenderTool({
    name: "setTodoDone",
    parameters: z.object({ id: z.string(), done: z.boolean() }),
    render: ({ status, parameters, result }) => {
      if (status !== "complete") {
        return (
          <ToolCall
            state="running"
            verb={
              parameters.done === false
                ? "Reopening an item"
                : "Crossing off an item"
            }
          />
        );
      }

      const parsed = setResult.safeParse(parseToolResult(result));
      if (!parsed.success || parsed.data.todo === null) {
        return <ToolCall state="done" verb="No such item on the list" />;
      }

      const { title, done } = parsed.data.todo;
      return (
        <ToolCall
          state="done"
          verb={done ? "Crossed off" : "Reopened"}
          detail={title}
        />
      );
    },
  });

  return null;
}
