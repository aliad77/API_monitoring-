import { redirect } from "next/navigation";
import { auth } from "@/auth";

/**
 * The only source of the current user's id. It comes from the signed session
 * cookie and is never read from request bodies or query strings.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");
  return userId;
}
