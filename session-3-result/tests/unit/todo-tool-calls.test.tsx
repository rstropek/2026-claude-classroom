// jsdom, the config default — this one renders, unlike the node-env tests.
import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { ToolCall } from "@/components/ui/tool-call";
import { parseToolResult } from "@/lib/tool-result";

describe("parseToolResult", () => {
  test("reads the JSON text AG-UI puts on a tool result", () => {
    expect(parseToolResult('{"todo":{"title":"Buy milk"}}')).toEqual({
      todo: { title: "Buy milk" },
    });
  });

  test("unwraps a result that was encoded twice", () => {
    expect(
      parseToolResult(JSON.stringify(JSON.stringify({ todos: [] }))),
    ).toEqual({
      todos: [],
    });
  });

  test("returns null rather than throwing on anything else", () => {
    expect(parseToolResult("not json")).toBeNull();
    expect(parseToolResult("")).toBeNull();
  });
});

describe("ToolCall", () => {
  test("states the verb in text, so the marker is never the only cue", () => {
    render(<ToolCall state="done" verb="Added" detail="Buy milk" />);

    expect(screen.getByText("Added")).toBeInTheDocument();
    expect(screen.getByText("Buy milk")).toBeInTheDocument();
  });

  test("renders without a detail", () => {
    render(<ToolCall state="running" verb="Consulting the list" />);

    expect(screen.getByText("Consulting the list")).toBeInTheDocument();
  });
});
