/**
 * Small typed fetch wrapper for client components.
 * Throws an Error carrying the API's `{ error: { message } }` text on non-2xx responses.
 */
export class ApiClientError extends Error {
  status: number;
  code: string;
  fields?: Record<string, string[]>;

  constructor(message: string, status: number, code: string, fields?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
    },
  });

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) {
    const err = (json as { error?: { code?: string; message?: string; fields?: Record<string, string[]> } } | null)
      ?.error;
    throw new ApiClientError(
      err?.message || `Request failed (${res.status})`,
      res.status,
      err?.code || "UNKNOWN",
      err?.fields
    );
  }

  return json as T;
}

export function errorMessage(err: unknown, fallback = "Something went wrong"): string {
  if (err instanceof ApiClientError && err.fields) {
    const first = Object.entries(err.fields)[0];
    if (first) return `${first[0]}: ${first[1][0]}`;
  }
  return err instanceof Error ? err.message : fallback;
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; limit: number; totalItems: number; totalPages: number };
}
