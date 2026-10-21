
export type FieldErrors = Record<string, string>;

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors: FieldErrors };

/** Small fetch wrapper for the JSON API, used by client components. */
export async function apiRequest<T = unknown>(
  url: string,
  method: "POST" | "PATCH" | "DELETE" | "GET",
  body?: unknown,
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const payload = response.status === 204 ? null : await response.json().catch(() => null);

    if (!response.ok) {
      return {
        ok: false,
        error: payload?.error ?? "Something went wrong. Please try again.",
        fieldErrors: payload?.fieldErrors ?? {},
      };
    }
    return { ok: true, data: payload as T };
  } catch {
    return { ok: false, error: "Network error. Check your connection and try again.", fieldErrors: {} };
  }
}
