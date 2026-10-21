import { unauthorized } from "@/lib/api";
import { getCurrentUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        readAt: true,
        createdAt: true,
        incidentId: true,
      },
    }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);

  return Response.json({ notifications, unreadCount });
}
