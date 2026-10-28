/**
 * Shared helpers for server-side pagination, search and sorting on list endpoints.
 */
export interface ListParams {
  page: number;
  limit: number;
  skip: number;
  q: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

export function parseListParams(
  searchParams: URLSearchParams,
  allowedSortFields: readonly string[],
  defaultSort: string,
  defaultOrder: "asc" | "desc" = "desc"
): ListParams {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10", 10) || 10));
  const requestedSort = searchParams.get("sortBy") || defaultSort;
  const requestedOrder = searchParams.get("sortOrder");

  return {
    page,
    limit,
    skip: (page - 1) * limit,
    q: searchParams.get("q")?.trim() || "",
    sortBy: allowedSortFields.includes(requestedSort) ? requestedSort : defaultSort,
    sortOrder:
      requestedOrder === "asc" || requestedOrder === "desc" ? requestedOrder : defaultOrder,
  };
}

export function paginationMeta(page: number, limit: number, totalItems: number) {
  return {
    page,
    limit,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / limit)),
  };
}

/**
 * Returns the value only if it is one of the allowed enum members, otherwise undefined.
 * Prevents invalid query-string values from reaching Prisma and causing 500s.
 */
export function enumParam<T extends string>(
  value: string | null | undefined,
  allowed: readonly T[]
): T | undefined {
  if (!value) return undefined;
  return (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}
