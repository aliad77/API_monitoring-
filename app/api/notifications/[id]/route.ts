import { z } from "zod";
import { notFound, parseBody, unauthorized } from "@/lib/api";
import { getCurrentUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

type Context = { params: Promise<{ id: string }> };

const schema = z.object({ read: z.boolean() });

export async function PATCH(request: Request, { params }: Context) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const { data, response } = await parseBody(request, schema);
  if (response) return response;

  const { id } = await params;
  const { count } = await prisma.notification.updateMany({
    where: { id, userId },
    data: { readAt: data.read ? new Date() : null },
  });
  if (count === 0) return notFound();

  return new Response(null, { status: 204 });
}
