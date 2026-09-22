"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthCard } from "@/components/ui/auth-card";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { authClient } from "@/lib/auth-client";

/** What each scope in lib/auth-config.ts's `mcpOptions` lets a client do. */
const scopeText: Record<string, string> = {
  todos: "Read your to-do list, add items, and mark them done",
  offline_access: "Keep that access without asking you to log in again",
};

/**
 * Who is asking, where the answer goes, and what it allows, then an explicit
 * approve or deny. The client name comes from the client's own metadata
 * document, so the page also shows the URL it was fetched from — that, not the
 * name, is what identifies the client.
 */
export function OAuthConsent({
  email,
  client,
  scopes,
  redirectUri,
}: {
  email: string;
  client: { id: string; name: string } | null;
  scopes: string[];
  redirectUri: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const footer = (
    <>
      Signed in as {email}.{" "}
      <Link href="/" className="font-semibold text-accent hover:underline">
        Back to Bartholomew
      </Link>
    </>
  );

  if (!client) {
    return (
      <AuthCard
        title="Unknown application"
        footer={footer}
        onSubmit={(event) => event.preventDefault()}
      >
        <p className="text-base text-ink">
          This request names no application this server knows. Start the
          connection again from the application.
        </p>
      </AuthCard>
    );
  }

  async function decide(accept: boolean) {
    setError(null);
    setPending(true);
    // On success the answer is a redirect back to the client, which the auth
    // client follows; this page is left behind either way.
    const { error: consentError } = await authClient.oauth2.consent({
      accept,
    });
    if (consentError) {
      setPending(false);
      setError(
        consentError.message ??
          "The request expired. Start the connection again from the application.",
      );
    }
  }

  return (
    <AuthCard
      title="Allow access?"
      footer={footer}
      onSubmit={(event) => {
        event.preventDefault();
        decide(true);
      }}
    >
      <p className="text-base text-ink">
        {client.name} wants to use your account {email}.
      </p>
      <dl className="flex flex-col gap-3 text-sm">
        <div className="flex flex-col gap-0.5">
          <dt className="text-ink-mute">Identified by</dt>
          <dd className="break-all text-ink">{client.id}</dd>
        </div>
        {redirectUri && (
          <div className="flex flex-col gap-0.5">
            <dt className="text-ink-mute">Returns to</dt>
            <dd className="break-all text-ink">{redirectUri}</dd>
          </div>
        )}
      </dl>
      <ul className="flex flex-col border-t border-rule text-sm text-ink">
        {scopes.map((scope) => (
          <li key={scope} className="border-b border-rule py-2">
            {scopeText[scope] ?? scope}
          </li>
        ))}
      </ul>
      <p className="text-sm text-ink-soft">
        Allow only if you just started connecting this application yourself.
      </p>
      <FormError message={error} />
      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          Allow
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => decide(false)}
        >
          Deny
        </Button>
      </div>
    </AuthCard>
  );
}
