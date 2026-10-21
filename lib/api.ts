import { Prisma } from "@prisma/client";
import type { z } from "zod";
import { toFieldErrors, type FieldErrors } from "@/lib/validation";

// Every error response has the same shape: { error, fieldErrors? }.
export function jsonError(
  status: number,
  error: string,
  fieldErrors?: FieldErrors,
) {
  return Response.json({ error, fieldErrors }, { status });
}

export const unauthorized = () => jsonError(401, "Authentication required.");
export const notFound = () => jsonError(404, "Not found.");

type ParseResult<T> =
  { data: T; response?: undefined } | { data?: undefined; response: Response };

export async function parseBody<Schema extends z.ZodTypeAny>(
  request: Request,
  schema: Schema,
): Promise<ParseResult<z.output<Schema>>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { response: jsonError(400, "Request body must be valid JSON.") };
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      response: jsonError(
        422,
        "Please correct the highlighted fields.",
        toFieldErrors(result.error),
      ),
    };
  }
  return { data: result.data };
}

export function parseLimit(
  value: string | null,
  fallback = 20,
  max = 100,
): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

export function isUniqueViolation(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}
