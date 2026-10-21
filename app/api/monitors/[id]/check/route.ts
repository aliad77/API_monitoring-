import { jsonError, notFound, unauthorized } from "@/lib/api";
import { getCurrentUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { earliestAllowedCheck, findUserMonitor } from "@/lib/data/monitors";

type Context = { params: Promise<{ id: string }> };

// The web app never makes outbound requests itself. "Check now" only moves the
// monitor's next check forward; the worker performs it on its next poll.
export async function POST(_request: Request, { params }: Context) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const monitor = await findUserMonitor(userId, id);
  if (!monitor) return notFound();
  if (!monitor.isActive) {
    return jsonError(409, "Resume this monitor before requesting a check.");
  }

  const nextCheckAt = earliestAllowedCheck(monitor.lastCheckedAt);
  await prisma.monitor.update({
    where: { id: monitor.id },
    data: { nextCheckAt },
  });

  return Response.json({ nextCheckAt }, { status: 202 });
}
