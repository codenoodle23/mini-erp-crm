import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { challansApi } from "../../api/resources";
import { type Challan, type ChallanStatus, type Paginated } from "../../types";
import { ChallanStatusPill } from "../../components/Pills";
import { PaginationBar } from "../../components/PaginationBar";
import { useAuth } from "../../context/AuthContext";
import { can, formatDateTime } from "../../utils/helpers";

export function ChallansListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [result, setResult] = useState<Paginated<Challan> | null>(null);
  const [status, setStatus] = useState<ChallanStatus | "">("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    challansApi.list({ page, status }).then((res) => {
      if (!cancelled) {
        setResult(res);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [page, status]);

  return (
    <div className="stack">
      <div className="section-title-row">
        <div>
          <h1 style={{ fontSize: 21, marginBottom: 4 }}>Sales challans</h1>
          <p style={{ color: "var(--slate)", fontSize: 13.5, margin: 0 }}>Draft, confirmed, and cancelled delivery challans.</p>
        </div>
        {can(user, "SALES") && (
          <button className="btn btn-primary" onClick={() => navigate("/challans/new")}>
            + New challan
          </button>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="row" style={{ gap: 8 }}>
            {(["", "DRAFT", "CONFIRMED", "CANCELLED"] as const).map((s) => (
              <button
                key={s || "ALL"}
                className={`btn btn-sm ${status === s ? "btn-primary" : "btn-secondary"}`}
                onClick={() => {
                  setPage(1);
                  setStatus(s);
                }}
              >
                {s || "All"}
              </button>
            ))}
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Challan #</th>
                <th>Customer</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Total qty</th>
                <th>Created by</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {!loading && result?.data.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <h3>No challans found</h3>
                      <p>Try a different filter, or create a new challan.</p>
                    </div>
                  </td>
                </tr>
              )}
              {result?.data.map((c) => (
                <tr key={c.id} onClick={() => navigate(`/challans/${c.id}`)}>
                  <td>
                    <span className="code-chip">{c.challanNumber}</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{c.customer?.name}</td>
                  <td>
                    <ChallanStatusPill status={c.status} />
                  </td>
                  <td className="num" style={{ textAlign: "right" }}>
                    {c.totalQuantity}
                  </td>
                  <td style={{ color: "var(--slate)" }}>{c.createdBy?.name ?? "—"}</td>
                  <td style={{ color: "var(--slate)" }}>{formatDateTime(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {result && result.pagination.total > 0 && <PaginationBar pagination={result.pagination} onPageChange={setPage} />}
      </div>
    </div>
  );
}
