import { jsonError, parseBody, unauthorized } from "@/lib/api";
import { getCurrentUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { listUserMonitors, monitorSelect } from "@/lib/data/monitors";
import { MAX_MONITORS_PER_USER } from "@/lib/monitoring/options";
import { monitorInputSchema } from "@/lib/validation";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const monitors = await listUserMonitors(userId);
  return Response.json({ monitors });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const { data, response } = await parseBody(request, monitorInputSchema);
  if (response) return response;

  const monitor = await prisma.$transaction(async (tx) => {
    // Lock the user's row so two simultaneous requests can't both pass the
    // limit check.
    await tx.$queryRaw`SELECT 1 FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
    const count = await tx.monitor.count({ where: { userId } });
    if (count >= MAX_MONITORS_PER_USER) return null;

    return tx.monitor.create({
      data: { ...data, userId, nextCheckAt: new Date() },
      select: monitorSelect,
    });
  });

  if (!monitor) {
    return jsonError(
      403,
      `You can have at most ${MAX_MONITORS_PER_USER} monitors.`,
    );
  }
  return Response.json({ monitor }, { status: 201 });
}
