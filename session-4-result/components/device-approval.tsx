"use client";

import { CLI_CLIENT_ID } from "ai-tutor-api-contract";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { AuthCard } from "@/components/ui/auth-card";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { authClient } from "@/lib/auth-client";

type Step =
  | { name: "enter" }
  | { name: "confirm"; userCode: string; client: string }
  | { name: "approved" | "denied" };

/** Better Auth ignores punctuation in its codes; show them as ABCD-EFGH. */
const displayCode = (code: string) => {
  const bare = code.replace(/[^0-9a-z]/gi, "").toUpperCase();
  return bare.length === 8 ? `${bare.slice(0, 4)}-${bare.slice(4)}` : bare;
};

/**
 * Enter (or confirm the prefilled) code, see who is asking, then approve or
 * deny explicitly — the three things RFC 8628 asks of an approval screen.
 */
export function DeviceApproval({
  initialCode,
  email,
}: {
  initialCode: string;
  email: string;
}) {
  const [step, setStep] = useState<Step>({ name: "enter" });
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

  async function onLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const userCode = String(new FormData(event.currentTarget).get("user_code"));
    setError(null);
    setPending(true);

    const { data } = await authClient.device({
      query: { user_code: userCode },
    });
    setPending(false);

    if (data?.status !== "pending") {
      setError(
        "That code is unknown, expired or already used. Run ai-tutor login again for a new one.",
      );
      return;
    }
    setStep({
      name: "confirm",
      userCode,
      client:
        data.client_id === CLI_CLIENT_ID
          ? "The ai-tutor command line"
          : `The client "${data.client_id}"`,
    });
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
          "The code could not be updated. Run ai-tutor login again for a new one.",
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
        onSubmit={(event) => event.preventDefault()}
      >
        <p className="text-base text-ink">
          {step.name === "approved"
            ? `Return to your terminal; it is now signed in as ${email}.`
            : "The login request was refused. Nothing was given access to your list."}
        </p>
      </AuthCard>
    );
  }

  if (step.name === "confirm") {
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
          {step.client} wants to sign in as {email}. It will be able to read and
          change your to-do list.
        </p>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-ink-soft">Code</span>
          <span className="text-xl font-semibold text-ink tabular-nums">
            {displayCode(step.userCode)}
          </span>
        </div>
        <p className="text-sm text-ink-soft">
          Approve only if you started this login yourself and your terminal
          shows the same code. Never approve a code someone sent you.
        </p>
        <FormError message={error} />
        <div className="flex gap-3">
          <Button type="submit" disabled={pending}>
            Approve
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => decide(step.userCode, false)}
          >
            Deny
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Connect a device" footer={footer} onSubmit={onLookup}>
      <p className="text-base text-ink">Enter the code your terminal shows.</p>
      <Field
        id="user_code"
        label="Code"
        defaultValue={displayCode(initialCode)}
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
