import { unauthorized } from "@/lib/api";
import { getCurrentUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function POST() {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });

  return new Response(null, { status: 204 });
}
