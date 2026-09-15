import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { OAuthConsent } from "@/components/oauth-consent";
import { auth } from "@/lib/auth";
import { mcpScope } from "@/lib/auth-config";

const scopeText: Record<string, string> = {
  [mcpScope]: "Read your to-do list, add to it, and mark items done",
  offline_access: "Stay connected until you revoke it, without asking again",
};

/**
 * Where the OAuth provider sends a signed-in user whose MCP client asks for
 * access it has not been granted yet. The query is signed by the provider and
 * goes back with the decision, so this page only reads it for display.
 */
export default async function ConsentPage({
  searchParams,
}: PageProps<"/consent">) {
  const query = await searchParams;
  const clientId = typeof query.client_id === "string" ? query.client_id : "";
  const scope = typeof query.scope === "string" ? query.scope : "";

  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) {
    // The session ended mid-flow: sign in, then come back with the same query.
    const back = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      for (const item of [value ?? []].flat()) back.append(key, item);
    }
    redirect(`/login?${new URLSearchParams({ redirect: `/consent?${back}` })}`);
  }

  // A metadata-document client was stored when it hit /oauth2/authorize, so
  // an unknown id here means a stale or hand-made link.
  const client = clientId
    ? await auth.api
        .getOAuthClientPublic({
          query: { client_id: clientId },
          headers: requestHeaders,
        })
        .catch(() => null)
    : null;

  return (
    <OAuthConsent
      client={
        client
          ? { name: client.client_name ?? null, id: client.client_id }
          : null
      }
      access={scope
        .split(" ")
        .filter(Boolean)
        .map((name) => scopeText[name] ?? name)}
      account={`${session.user.name} (${session.user.email})`}
    />
  );
}
