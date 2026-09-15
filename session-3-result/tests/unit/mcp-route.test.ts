// @vitest-environment node
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrate } from "drizzle-orm/libsql/migrator";
import { drizzle } from "drizzle-orm/libsql/node";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";

// The real route modules and lib/auth.ts, on a throwaway file; `server-only`
// would otherwise resolve to its throwing build.
vi.mock("server-only", () => ({}));

const baseURL = "http://localhost:3000";
const resourceMetadataUrl = `${baseURL}/.well-known/oauth-protected-resource/api/mcp`;

let dir: string;
let mcpRoute: typeof import("@/app/api/mcp/route");
let resourceMetadataRoute: typeof import("@/app/.well-known/oauth-protected-resource/[[...path]]/route");
let authServerMetadataRoute: typeof import("@/app/.well-known/oauth-authorization-server/[[...path]]/route");

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "ai-tutor-mcp-route-"));
  const url = `file:${join(dir, "test.db")}`;
  vi.stubEnv("DATABASE_URL", url);
  vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-at-least-32-characters-long");
  vi.stubEnv("BETTER_AUTH_URL", baseURL);

  const migrationDb = drizzle({ connection: { url } });
  await migrate(migrationDb, { migrationsFolder: "./drizzle" });
  migrationDb.$client.close();

  mcpRoute = await import("@/app/api/mcp/route");
  resourceMetadataRoute = await import(
    "@/app/.well-known/oauth-protected-resource/[[...path]]/route"
  );
  authServerMetadataRoute = await import(
    "@/app/.well-known/oauth-authorization-server/[[...path]]/route"
  );
});

afterAll(async () => {
  (await import("@/lib/db")).db.$client.close();
  vi.unstubAllEnvs();
  await rm(dir, { recursive: true, force: true });
});

const toolsList = (headers: Record<string, string> = {}) =>
  new Request(`${baseURL}/api/mcp`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      ...headers,
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
  });

async function expectChallenge(response: Response) {
  expect(response.status).toBe(401);
  const challenge = response.headers.get("www-authenticate");
  expect(challenge).toMatch(/^Bearer /);
  expect(challenge).toContain(`resource_metadata="${resourceMetadataUrl}"`);
  expect(challenge).toContain('scope="todos"');
  expect(await response.json()).toMatchObject({
    jsonrpc: "2.0",
    error: { code: expect.any(Number) },
  });
}

describe("/api/mcp", () => {
  test("answers a request without a token with the OAuth challenge", async () => {
    await expectChallenge(await mcpRoute.POST(toolsList()));
  });

  test("challenges a token that is not one of its access tokens", async () => {
    await expectChallenge(
      await mcpRoute.POST(toolsList({ authorization: "Bearer not-a-jwt" })),
    );
  });

  test("challenges GET too, before any protocol handling", async () => {
    await expectChallenge(
      await mcpRoute.GET(new Request(`${baseURL}/api/mcp`)),
    );
  });
});

describe("OAuth discovery", () => {
  test("serves the protected resource metadata the challenge names", async () => {
    const response = await resourceMetadataRoute.GET(
      new Request(resourceMetadataUrl),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      resource: `${baseURL}/api/mcp`,
      authorization_servers: [`${baseURL}/api/auth`],
      bearer_methods_supported: ["header"],
      scopes_supported: ["todos"],
    });
  });

  test("serves the authorization server metadata at the path-inserted URL", async () => {
    const response = await authServerMetadataRoute.GET(
      new Request(`${baseURL}/.well-known/oauth-authorization-server/api/auth`),
    );

    expect(response.status).toBe(200);
    const metadata = await response.json();
    expect(metadata).toMatchObject({
      issuer: `${baseURL}/api/auth`,
      authorization_endpoint: `${baseURL}/api/auth/oauth2/authorize`,
      token_endpoint: `${baseURL}/api/auth/oauth2/token`,
      jwks_uri: `${baseURL}/api/auth/jwks`,
      client_id_metadata_document_supported: true,
      code_challenge_methods_supported: ["S256"],
      grant_types_supported: ["authorization_code", "refresh_token"],
    });
    // Clients identify themselves by metadata URL, never by registering.
    expect(metadata).not.toHaveProperty("registration_endpoint");
  });
});
