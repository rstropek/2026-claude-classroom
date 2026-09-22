/**
 * AG-UI ships a tool result as the JSON text of the value the tool returned,
 * and a re-encoded one arrives as a quoted string rather than an object, so
 * unwrap one extra layer before giving up. Kept out of the component so a test
 * can reach it without pulling in CopilotKit's stylesheet.
 */
export function parseToolResult(raw: string): unknown {
  try {
    const once = JSON.parse(raw);
    return typeof once === "string" ? JSON.parse(once) : once;
  } catch {
    return null;
  }
}
