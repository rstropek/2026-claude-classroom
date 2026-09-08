"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { AuthCard } from "@/components/ui/auth-card";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setPending(true);

    const { error: signInError } = await authClient.signIn.email({
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

    router.replace("/");
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
