"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthCard } from "@/components/ui/auth-card";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { authClient } from "@/lib/auth-client";

const footer = (
  <Link href="/" className="font-semibold text-accent hover:underline">
    Back to Bartholomew
  </Link>
);

/**
 * The client's name comes from its own metadata document, so it is shown next
 * to the host that published that document, which it cannot fake.
 */
function describeClient(client: { name: string | null; id: string }) {
  let host = client.id;
  try {
    host = new URL(client.id).host;
  } catch {}
  return client.name ? `${client.name} (from ${host})` : host;
}

/**
 * The OAuth consent screen: which client, which account, which access, and an
 * explicit approve or deny. Either answer redirects back to the client, which
 * Better Auth's client does by itself once the call returns.
 */
export function OAuthConsent({
  client,
  access,
  account,
}: {
  client: { name: string | null; id: string } | null;
  /** One line per requested scope, already put into words. */
  access: string[];
  account: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"approve" | "deny" | null>(null);

  if (!client) {
    return (
      <AuthCard title="Unknown application" footer={footer}>
        <p className="text-base text-ink">
          This request does not name an application this site knows. Start the
          connection again from the application.
        </p>
      </AuthCard>
    );
  }

  async function decide(accept: boolean) {
    setError(null);
    setPending(accept ? "approve" : "deny");
    const { error: consentError } = await authClient.oauth2.consent({
      accept,
    });
    if (consentError) {
      setPending(null);
      setError(
        consentError.message ??
          "The request has expired. Start the connection again from the application.",
      );
    }
    // On success the page is already navigating back to the client.
  }

  return (
    <AuthCard
      title="Connect an application?"
      footer={footer}
      onSubmit={(event) => {
        event.preventDefault();
        decide(true);
      }}
    >
      <p className="text-base text-ink">
        <span className="font-semibold">{describeClient(client)}</span> is
        asking to act as <span className="font-semibold">{account}</span>. It
        could:
      </p>
      <ul className="flex flex-col border-y border-rule text-sm text-ink">
        {access.map((line) => (
          <li key={line} className="border-b border-rule py-2 last:border-b-0">
            {line}
          </li>
        ))}
      </ul>
      <p className="text-sm text-ink-soft">
        Allow this only if you just connected this application yourself.
      </p>
      <FormError message={error} />
      <div className="flex gap-3">
        <Button type="submit" disabled={pending !== null} className="flex-1">
          {pending === "approve" ? "Connecting…" : "Allow"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={pending !== null}
          className="flex-1"
          onClick={() => decide(false)}
        >
          Deny
        </Button>
      </div>
    </AuthCard>
  );
}
