"use client";

// CLIENT half. The provider talks to /api/copilotkit, CopilotChat draws the
// transcript, useRenderTool decides what a getWeather call looks like.
import {
  CopilotChat,
  CopilotKit,
  useRenderTool,
} from "@copilotkit/react-core/v2";
import "@copilotkit/react-core/v2/styles.css";
import { z } from "zod";

const card: React.CSSProperties = {
  border: "1px solid #d4d4d4",
  borderRadius: 8,
  padding: "10px 14px",
  margin: "6px 0",
  fontFamily: "system-ui, sans-serif",
  fontSize: 14,
};

const note: React.CSSProperties = { fontSize: 11, color: "#777" };

/**
 * Registering a renderer is a hook call, so it has to run inside the
 * <CopilotKit> provider. That is the only reason this is its own component; it
 * draws nothing of its own and returns null.
 */
function WeatherToolRenderer() {
  useRenderTool({
    name: "getWeather", // <-- THE LINK: must equal the tool id in app/api/copilotkit/[...all]/route.ts
    parameters: z.object({ city: z.string() }),
    render: ({ status, parameters, result }) => {
      // Until the result is there, the status is "inProgress" and `parameters`
      // fills in as the model's arguments stream, so `city` can be missing.
      // A tool that runs on the server goes from there straight to "complete".
      if (status !== "complete") {
        return (
          <div style={card}>
            <div>Looking up {parameters.city ?? "…"}…</div>
            <div style={note}>{status}</div>
          </div>
        );
      }

      // "complete": the result crosses the wire as JSON text, not as an object.
      const weather = JSON.parse(result);
      return (
        <div style={card}>
          <strong>{weather.city}</strong>
          <div>
            {weather.temperature} °C, {weather.condition}
          </div>
        </div>
      );
    },
  });

  return null;
}

export default function Page() {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit">
      <WeatherToolRenderer />
      <div style={{ height: "100vh", maxWidth: 760, margin: "0 auto" }}>
        <CopilotChat />
      </div>
    </CopilotKit>
  );
}
