"use client";

import { useActionState } from "react";
import {
  changePassword,
  deleteAccount,
  updateProfile,
  type SettingsFormState,
} from "@/app/(dashboard)/settings/actions";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/field";

function Success({ message }: { message?: string }) {
  return (
    <p aria-live="polite" className="text-sm text-emerald-700 dark:text-emerald-400">
      {message}
    </p>
  );
}

export function ProfileForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState<SettingsFormState, FormData>(updateProfile, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      <Field id="name" label="Name" error={state.fieldErrors?.name}>
        <Input id="name" defaultValue={name} autoComplete="name" error={state.fieldErrors?.name} />
      </Field>
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          Save
        </Button>
        <Success message={state.success} />
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<SettingsFormState, FormData>(changePassword, {});
  const errors = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <Field id="currentPassword" label="Current password" error={errors.currentPassword}>
        <Input id="currentPassword" type="password" autoComplete="current-password" error={errors.currentPassword} />
      </Field>
      <Field id="newPassword" label="New password" error={errors.newPassword} hint="At least 8 characters.">
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          error={errors.newPassword}
          hint="At least 8 characters."
        />
      </Field>
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          Change password
        </Button>
        <Success message={state.success} />
      </div>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState<SettingsFormState, FormData>(deleteAccount, {});
  return (
    <form
      action={action}
      className="space-y-4"
      noValidate
      onSubmit={(event) => {
        if (!window.confirm("Permanently delete your account and all monitoring data?")) {
          event.preventDefault();
        }
      }}
    >
      <FormError message={state.error} />
      <Field id="confirmPassword" label="Confirm with your password" error={state.fieldErrors?.confirmPassword}>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="current-password"
          error={state.fieldErrors?.confirmPassword}
        />
      </Field>
      <Button type="submit" variant="danger" disabled={pending}>
        Delete account
      </Button>
    </form>
  );
}
