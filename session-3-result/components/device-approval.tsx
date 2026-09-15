"use client";

import { cliClientId } from "ai-tutor-contract";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { AuthCard } from "@/components/ui/auth-card";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { authClient } from "@/lib/auth-client";

type Step =
  | { name: "enter" }
  | { name: "review"; userCode: string; client: string }
  | { name: "approved" | "denied" };

/** Default codes ignore case and punctuation; the endpoints get the bare form. */
const normalize = (code: string) =>
  code.replace(/[^a-z0-9]/gi, "").toUpperCase();

const display = (code: string) =>
  code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;

const clientName = (clientId: string) =>
  clientId === cliClientId
    ? "The ai-tutor command-line tool"
    : `A client called "${clientId}"`;

const footer = (
  <Link href="/" className="font-semibold text-accent hover:underline">
    Back to Bartholomew
  </Link>
);

/**
 * RFC 8628's approval UI: the user types the code the device shows, sees which
 * client asks for which account, and has to approve or deny explicitly.
 */
export function DeviceApproval({
  initialCode,
  account,
}: {
  initialCode: string;
  account: string;
}) {
  const [step, setStep] = useState<Step>({ name: "enter" });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const userCode = normalize(
      String(new FormData(event.currentTarget).get("code")),
    );
    setError(null);
    setPending(true);

    // Verifying while signed in claims the code for this session.
    const { data } = await authClient.device({
      query: { user_code: userCode },
    });
    setPending(false);

    if (!data) {
      setError(
        "That code is not valid or has expired. Run the login again for a new one.",
      );
    } else if (data.status !== "pending") {
      setError("That code has already been used.");
    } else if (!data.client_id) {
      setError("That code was already claimed by another account.");
    } else {
      setStep({ name: "review", userCode, client: clientName(data.client_id) });
    }
  }

  async function decide(userCode: string, approve: boolean) {
    setError(null);
    setPending(true);
    const { error: decideError } = approve
      ? await authClient.device.approve({ userCode })
      : await authClient.device.deny({ userCode });
    setPending(false);

    if (decideError) {
      setError(
        decideError.error_description ??
          "The request could not be completed. Run the login again for a new code.",
      );
      return;
    }
    setStep({ name: approve ? "approved" : "denied" });
  }

  if (step.name === "approved" || step.name === "denied") {
    return (
      <AuthCard
        title={step.name === "approved" ? "Device approved" : "Device denied"}
        footer={footer}
      >
        <p className="text-base text-ink">
          {step.name === "approved"
            ? "Return to your terminal. It finishes logging in on its own within a few seconds."
            : "The device was not signed in. You can close this page."}
        </p>
      </AuthCard>
    );
  }

  if (step.name === "review") {
    return (
      <AuthCard
        title="Approve this device?"
        footer={footer}
        onSubmit={(event) => {
          event.preventDefault();
          decide(step.userCode, true);
        }}
      >
        <p className="text-base text-ink">
          {step.client} is asking to sign in as{" "}
          <span className="font-semibold">{account}</span>, with full access to
          your to-do list.
        </p>
        <p className="border-y border-rule py-2 text-center text-xl font-semibold text-ink">
          {display(step.userCode)}
        </p>
        <p className="text-sm text-ink-soft">
          Approve only if you started this login yourself and the code matches
          the one in your terminal. Never approve a code someone sent you.
        </p>
        <FormError message={error} />
        <div className="flex gap-3">
          <Button type="submit" disabled={pending} className="flex-1">
            {pending ? "Working…" : "Approve"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            className="flex-1"
            onClick={() => decide(step.userCode, false)}
          >
            Deny
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Connect a device" footer={footer} onSubmit={verify}>
      <p className="text-sm text-ink-soft">
        Enter the code that{" "}
        <span className="font-semibold">ai-tutor login</span> printed in your
        terminal.
      </p>
      <Field
        id="code"
        label="Code"
        defaultValue={initialCode}
        placeholder="ABCD-EFGH"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        required
      />
      <FormError message={error} />
      <Button type="submit" disabled={pending}>
        {pending ? "Checking…" : "Continue"}
      </Button>
    </AuthCard>
  );
}
