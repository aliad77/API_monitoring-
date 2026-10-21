import {
  isUniqueViolation,
  jsonError,
  parseBody,
  unauthorized,
} from "@/lib/api";
import { getCurrentUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { listUserStatusPages, ownsAllMonitors } from "@/lib/data/status-pages";
import { MAX_STATUS_PAGES_PER_USER } from "@/lib/monitoring/options";
import { statusPageInputSchema } from "@/lib/validation";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const statusPages = await listUserStatusPages(userId);
  return Response.json({ statusPages });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const { data, response } = await parseBody(request, statusPageInputSchema);
  if (response) return response;

  if (!(await ownsAllMonitors(userId, data.monitorIds))) {
    return jsonError(422, "Select only your own monitors.", {
      monitorIds: "Unknown monitor",
    });
  }
  const existing = await prisma.statusPage.count({ where: { userId } });
  if (existing >= MAX_STATUS_PAGES_PER_USER) {
    return jsonError(
      403,
      `You can have at most ${MAX_STATUS_PAGES_PER_USER} status pages.`,
    );
  }

  try {
    const statusPage = await prisma.statusPage.create({
      data: {
        userId,
        title: data.title,
        slug: data.slug,
        description: data.description || null,
        monitors: {
          create: [...new Set(data.monitorIds)].map((monitorId, position) => ({
            monitorId,
            position,
          })),
        },
      },
      select: { id: true, slug: true, title: true },
    });
    return Response.json({ statusPage }, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return jsonError(409, "That address is already taken.", {
        slug: "Already taken",
      });
    }
    throw error;
  }
}
