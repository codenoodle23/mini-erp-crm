import { type Pagination } from "../types";

export function PaginationBar({ pagination, onPageChange }: { pagination: Pagination; onPageChange: (page: number) => void }) {
  const { page, totalPages, total } = pagination;
  return (
    <div className="pagination">
      <span>{total} total</span>
      <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        Previous
      </button>
      <span>
        Page {page} of {totalPages}
      </span>
      <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
        Next
      </button>
    </div>
  );
}
