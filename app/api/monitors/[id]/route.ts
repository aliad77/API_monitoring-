import { notFound, parseBody, unauthorized } from "@/lib/api";
import { getCurrentUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import {
  earliestAllowedCheck,
  findUserMonitor,
  monitorSelect,
} from "@/lib/data/monitors";
import { monitorUpdateSchema } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const monitor = await findUserMonitor(userId, id);
  if (!monitor) return notFound();

  return Response.json({ monitor });
}

export async function PATCH(request: Request, { params }: Context) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const existing = await findUserMonitor(userId, id);
  if (!existing) return notFound();

  const { data, response } = await parseBody(request, monitorUpdateSchema);
  if (response) return response;

  const monitor = await prisma.monitor.update({
    where: { id: existing.id },
    data: {
      ...data,
      // Any in-flight check was started with the old configuration. Clearing
      // the lease makes the worker discard its result, and the monitor is
      // re-checked with the new settings as soon as the rate limit allows.
      leaseToken: null,
      leaseExpiresAt: null,
      nextCheckAt: earliestAllowedCheck(existing.lastCheckedAt),
    },
    select: monitorSelect,
  });

  return Response.json({ monitor });
}

export async function DELETE(_request: Request, { params }: Context) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  // deleteMany lets the ownership condition live in the same statement.
  const { count } = await prisma.monitor.deleteMany({ where: { id, userId } });
  if (count === 0) return notFound();

  return new Response(null, { status: 204 });
}
