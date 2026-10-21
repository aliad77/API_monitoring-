import { notFound, parseLimit, unauthorized } from "@/lib/api";
import { getCurrentUserId } from "@/lib/auth/session";
import { findUserMonitor, listChecks } from "@/lib/data/monitors";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const monitor = await findUserMonitor(userId, id);
  if (!monitor) return notFound();

  const searchParams = new URL(request.url).searchParams;
  const page = await listChecks(monitor.id, {
    cursor: searchParams.get("cursor"),
    limit: parseLimit(searchParams.get("limit")),
  });

  return Response.json(page);
}
