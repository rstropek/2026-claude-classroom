"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { AuthCard } from "@/components/ui/auth-card";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { authClient } from "@/lib/auth-client";

/**
 * `?redirect=` as set by a gated page such as /device, limited to same-origin
 * paths so the login form cannot be used to bounce a user to another site.
 */
function redirectTarget() {
  const target = new URLSearchParams(window.location.search).get("redirect");
  return target?.startsWith("/") && !/^\/[/\\]/.test(target) ? target : "/";
}

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setPending(true);

    const { data, error: signInError } = await authClient.signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });

    if (signInError) {
      setError(
        signInError.message ??
          "That email and password don't match an account.",
      );
      setPending(false);
      return;
    }

    // Reached from /oauth2/authorize (an MCP client's login): the answer is the
    // next step of that flow, which the auth client already navigates to.
    if (data?.redirect && data.url) {
      return;
    }

    router.replace(redirectTarget());
    router.refresh();
  }

  return (
    <AuthCard
      title="Log in"
      onSubmit={onSubmit}
      footer={
        <>
          Need an account?{" "}
          <Link
            href="/signup"
            className="font-semibold text-accent hover:underline"
          >
            Sign up
          </Link>
        </>
      }
    >
      <Field
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        required
      />
      <Field
        id="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        required
      />
      <FormError message={error} />
      <Button type="submit" disabled={pending}>
        {pending ? "Logging in…" : "Log in"}
      </Button>
    </AuthCard>
  );
}
