import { Request } from "express";

export interface PaginationParams {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export function getPagination(req: Request): PaginationParams {
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const rawPageSize = parseInt(String(req.query.pageSize ?? DEFAULT_PAGE_SIZE), 10);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number.isNaN(rawPageSize) ? DEFAULT_PAGE_SIZE : rawPageSize)
  );
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function buildPaginatedResponse<T>(
  data: T[],
  total: number,
  { page, pageSize }: PaginationParams
) {
  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}
