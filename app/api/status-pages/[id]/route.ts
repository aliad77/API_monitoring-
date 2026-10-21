import {
  isUniqueViolation,
  jsonError,
  notFound,
  parseBody,
  unauthorized,
} from "@/lib/api";
import { getCurrentUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { findUserStatusPage, ownsAllMonitors } from "@/lib/data/status-pages";
import { statusPageUpdateSchema } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const statusPage = await findUserStatusPage(userId, id);
  if (!statusPage) return notFound();

  return Response.json({ statusPage });
}

export async function PATCH(request: Request, { params }: Context) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const existing = await findUserStatusPage(userId, id);
  if (!existing) return notFound();

  const { data, response } = await parseBody(request, statusPageUpdateSchema);
  if (response) return response;

  const monitorIds = data.monitorIds
    ? [...new Set(data.monitorIds)]
    : undefined;
  if (monitorIds && !(await ownsAllMonitors(userId, monitorIds))) {
    return jsonError(422, "Select only your own monitors.", {
      monitorIds: "Unknown monitor",
    });
  }

  try {
    const statusPage = await prisma.$transaction(async (tx) => {
      if (monitorIds) {
        await tx.statusPageMonitor.deleteMany({
          where: { statusPageId: existing.id },
        });
        await tx.statusPageMonitor.createMany({
          data: monitorIds.map((monitorId, position) => ({
            statusPageId: existing.id,
            monitorId,
            position,
          })),
        });
      }
      return tx.statusPage.update({
        where: { id: existing.id },
        data: {
          title: data.title,
          slug: data.slug,
          description:
            data.description === undefined
              ? undefined
              : data.description || null,
        },
        select: { id: true, slug: true, title: true },
      });
    });
    return Response.json({ statusPage });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return jsonError(409, "That address is already taken.", {
        slug: "Already taken",
      });
    }
    throw error;
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const { count } = await prisma.statusPage.deleteMany({
    where: { id, userId },
  });
  if (count === 0) return notFound();

  return new Response(null, { status: 204 });
}
