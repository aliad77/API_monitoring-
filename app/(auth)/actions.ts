"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db";
import { isUniqueViolation } from "@/lib/api";
import {
  loginSchema,
  registerSchema,
  toFieldErrors,
  type FieldErrors,
} from "@/lib/validation";

// `values` echoes back non-secret input so the form isn't cleared on errors.
export type AuthFormState = {
  error?: string;
  fieldErrors?: FieldErrors;
  values?: { name?: string; email?: string };
};

export async function login(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const values = { email: String(formData.get("email") ?? "") };
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { fieldErrors: toFieldErrors(parsed.error), values };

  try {
    await signIn("credentials", { ...parsed.data, redirectTo: "/dashboard" });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Incorrect email or password.", values };
    }
    // signIn redirects by throwing; that must propagate.
    throw error;
  }
}

export async function register(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const values = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
  };
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { fieldErrors: toFieldErrors(parsed.error), values };

  try {
    await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash: await hashPassword(parsed.data.password),
      },
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        fieldErrors: { email: "An account with this email already exists." },
        values,
      };
    }
    throw error;
  }

  await signIn("credentials", {
    email: parsed.data.email,
    password: parsed.data.password,
    redirectTo: "/dashboard",
  });
  return {};
}

export async function logout() {
  await signOut({ redirectTo: "/" });
}
