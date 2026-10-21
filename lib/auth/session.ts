import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

/**
 * The only source of the current user's id. It comes from the signed session
 * cookie and is never read from request bodies or query strings.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  // JWT sessions can't be revoked, so confirm the account still exists. A
  // deleted account's token then stops working on its next request.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  return user?.id ?? null;
}

export async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");
  return userId;
}
