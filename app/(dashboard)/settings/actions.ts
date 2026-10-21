"use server";

import { revalidatePath } from "next/cache";
import { signOut } from "@/auth";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { requireUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { passwordChangeSchema, profileSchema, toFieldErrors, type FieldErrors } from "@/lib/validation";

export type SettingsFormState = { error?: string; success?: string; fieldErrors?: FieldErrors };

export async function updateProfile(_state: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const userId = await requireUserId();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  await prisma.user.update({ where: { id: userId }, data: { name: parsed.data.name } });
  revalidatePath("/", "layout");
  return { success: "Profile updated." };
}

export async function changePassword(_state: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const userId = await requireUserId();
  const parsed = passwordChangeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!user || !(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
    return { fieldErrors: { currentPassword: "Current password is incorrect." } };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });
  return { success: "Password changed." };
}

export async function deleteAccount(_state: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const userId = await requireUserId();
  const password = String(formData.get("confirmPassword") ?? "");

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { fieldErrors: { confirmPassword: "Password is incorrect." } };
  }

  // Monitors, checks, incidents, notifications and status pages are removed
  // by ON DELETE CASCADE.
  await prisma.user.delete({ where: { id: userId } });
  await signOut({ redirectTo: "/" });
  return {};
}
