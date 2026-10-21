"use client";

import { useActionState } from "react";
import { register, type AuthFormState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/field";

export function RegisterForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(register, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError message={state.error} />
      <Field id="name" label="Name" error={errors.name}>
        <Input id="name" autoComplete="name" required defaultValue={state.values?.name} error={errors.name} />
      </Field>
      <Field id="email" label="Email" error={errors.email}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.values?.email}
          error={errors.email}
        />
      </Field>
      <Field id="password" label="Password" error={errors.password} hint="At least 8 characters.">
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          error={errors.password}
          hint="At least 8 characters."
        />
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
