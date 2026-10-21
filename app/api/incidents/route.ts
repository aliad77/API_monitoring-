import { parseLimit, unauthorized } from "@/lib/api";
import { getCurrentUserId } from "@/lib/auth/session";
import { listIncidents, type IncidentFilter } from "@/lib/data/incidents";

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const searchParams = new URL(request.url).searchParams;
  const status = searchParams.get("status");
  const filter: IncidentFilter =
    status === "open" || status === "resolved" ? status : "all";

  const page = await listIncidents(userId, {
    cursor: searchParams.get("cursor"),
    limit: parseLimit(searchParams.get("limit")),
    filter,
    monitorId: searchParams.get("monitorId") ?? undefined,
  });

  return Response.json(page);
}
