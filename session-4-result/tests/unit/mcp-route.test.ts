// @vitest-environment node
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrate } from "drizzle-orm/libsql/migrator";
import { drizzle } from "drizzle-orm/libsql/node";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";

// The real routes over a throwaway file, like todos-api.test.ts: lib/auth and
// lib/db are `server-only` and read DATABASE_URL and BETTER_AUTH_* themselves.
vi.mock("server-only", () => ({}));

const baseURL = "http://localhost:3000";
const resource = `${baseURL}/api/mcp`;
const resourceMetadataUrl = `${baseURL}/.well-known/oauth-protected-resource/api/mcp`;
const issuer = `${baseURL}/api/auth`;

let dir: string;
let db: ReturnType<typeof drizzle>;
let mcpRoute: typeof import("@/app/api/mcp/route");
let resourceMetadataRoute: typeof import("@/app/.well-known/oauth-protected-resource/api/mcp/route");
let authServerMetadataRoute: typeof import("@/app/.well-known/oauth-authorization-server/api/auth/route");

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "ai-tutor-mcp-route-"));
  const url = `file:${join(dir, "test.db")}`;
  vi.stubEnv("DATABASE_URL", url);
  vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-at-least-32-characters-long");
  vi.stubEnv("BETTER_AUTH_URL", baseURL);

  db = drizzle({ connection: { url } });
  await migrate(db, { migrationsFolder: "./drizzle" });

  mcpRoute = await import("@/app/api/mcp/route");
  resourceMetadataRoute = await import(
    "@/app/.well-known/oauth-protected-resource/api/mcp/route"
  );
  authServerMetadataRoute = await import(
    "@/app/.well-known/oauth-authorization-server/api/auth/route"
  );
});

afterAll(async () => {
  db.$client.close();
  (globalThis as { db?: typeof db }).db?.$client.close();
  vi.unstubAllEnvs();
  await rm(dir, { recursive: true, force: true });
});

const initialize = (headers: Record<string, string> = {}) =>
  new Request(resource, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      ...headers,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-11-25",
        capabilities: {},
        clientInfo: { name: "test", version: "0.0.0" },
      },
    }),
  });

describe("POST /api/mcp", () => {
  test("without a token is 401 with a challenge naming the resource metadata", async () => {
    const response = await mcpRoute.POST(initialize());

    expect(response.status).toBe(401);
    const challenge = response.headers.get("www-authenticate");
    expect(challenge).toMatch(/^Bearer /);
    expect(challenge).toContain(`resource_metadata="${resourceMetadataUrl}"`);
    expect(challenge).toContain('scope="todos"');
    expect(await response.json()).toMatchObject({
      jsonrpc: "2.0",
      error: { code: -32000 },
    });
  });

  test("with a token that is not a verifiable access token is 401", async () => {
    // A session token, say, or anything else that is not a JWT this server
    // signed for /api/mcp.
    const response = await mcpRoute.POST(
      initialize({ authorization: "Bearer not-a-jwt" }),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain(
      "resource_metadata=",
    );
  });
});

describe("OAuth discovery", () => {
  test("serves protected resource metadata for /api/mcp", async () => {
    const response = await resourceMetadataRoute.GET(
      new Request(resourceMetadataUrl),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      resource,
      authorization_servers: [issuer],
      bearer_methods_supported: ["header"],
      scopes_supported: ["todos"],
    });
  });

  test("serves authorization server metadata with CIMD and PKCE, without DCR", async () => {
    const response = await authServerMetadataRoute.GET(
      new Request(`${baseURL}/.well-known/oauth-authorization-server/api/auth`),
    );

    expect(response.status).toBe(200);
    const metadata = await response.json();
    expect(metadata).toMatchObject({
      issuer,
      authorization_endpoint: `${issuer}/oauth2/authorize`,
      token_endpoint: `${issuer}/oauth2/token`,
      client_id_metadata_document_supported: true,
      code_challenge_methods_supported: ["S256"],
    });
    expect(metadata.scopes_supported).toEqual(
      expect.arrayContaining(["todos", "offline_access"]),
    );
    expect(metadata.token_endpoint_auth_methods_supported).toContain("none");
    expect(metadata).not.toHaveProperty("registration_endpoint");
  });
});
