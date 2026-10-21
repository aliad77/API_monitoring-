"use client";

import { useActionState } from "react";
import { login, type AuthFormState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/field";

export function LoginForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(
    login,
    {},
  );

  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError message={state.error} />
      <Field id="email" label="Email" error={state.fieldErrors?.email}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.values?.email}
          error={state.fieldErrors?.email}
        />
      </Field>
      <Field id="password" label="Password" error={state.fieldErrors?.password}>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          error={state.fieldErrors?.password}
        />
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
