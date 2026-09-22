import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { OAuthConsent } from "@/components/oauth-consent";
import { auth } from "@/lib/auth";

/**
 * Where /oauth2/authorize sends a signed-in user to let an MCP client such as
 * Claude Code at the to-do list. The query is signed by the server and
 * forwarded verbatim by the auth client when the user decides, so the page
 * reads it only to show what is being asked.
 */
export default async function ConsentPage({
  searchParams,
}: PageProps<"/consent">) {
  const query = await searchParams;
  const param = (name: string) => {
    const value = query[name];
    return typeof value === "string" ? value : "";
  };

  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) {
    const back = `/consent?${new URLSearchParams(
      Object.entries(query).flatMap(([key, value]) =>
        (Array.isArray(value) ? value : [value ?? ""]).map((v) => [key, v]),
      ),
    )}`;
    redirect(`/login?${new URLSearchParams({ redirect: back })}`);
  }

  const clientId = param("client_id");
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
      email={session.user.email}
      client={
        client && {
          id: clientId,
          name: client.client_name ?? clientId,
        }
      }
      scopes={param("scope").split(" ").filter(Boolean)}
      redirectUri={param("redirect_uri")}
    />
  );
}
