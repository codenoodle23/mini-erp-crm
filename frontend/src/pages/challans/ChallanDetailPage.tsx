import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { challansApi } from "../../api/resources";
import type { Challan } from "../../types";
import { ChallanStatusPill } from "../../components/Pills";
import { useAuth } from "../../context/AuthContext";
import { can, formatCurrency, formatDateTime } from "../../utils/helpers";
import { ApiClientError } from "../../api/client";

export function ChallanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [challan, setChallan] = useState<Challan | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    if (!id) return;
    const res = await challansApi.get(id);
    setChallan(res.data);
    setLoading(false);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleConfirm() {
    if (!id) return;
    setActionLoading(true);
    setError(null);
    try {
      await challansApi.confirm(id);
      await reload();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not confirm the challan.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel() {
    if (!id) return;
    if (!window.confirm("Cancel this challan? If it was confirmed, stock will be restored.")) return;
    setActionLoading(true);
    setError(null);
    try {
      await challansApi.cancel(id);
      await reload();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not cancel the challan.");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading || !challan) return <p style={{ color: "var(--slate)" }}>Loading...</p>;

  const total = challan.items.reduce((sum, i) => sum + Number(i.lineTotal), 0);

  return (
    <div className="stack">
      <div className="breadcrumb">
        <Link to="/challans">Sales challans</Link> / {challan.challanNumber}
      </div>

      <div className="section-title-row">
        <div>
          <div className="row" style={{ gap: 10 }}>
            <h1 style={{ fontSize: 21, fontFamily: "var(--font-mono)" }}>{challan.challanNumber}</h1>
            <ChallanStatusPill status={challan.status} />
          </div>
          <p style={{ color: "var(--slate)", margin: "2px 0 0", fontSize: 13.5 }}>
            {challan.customer?.name} · created {formatDateTime(challan.createdAt)} by {challan.createdBy?.name}
          </p>
        </div>
        <div className="row">
          {challan.status === "DRAFT" && can(user, "SALES") && (
            <button className="btn btn-primary" onClick={handleConfirm} disabled={actionLoading}>
              {actionLoading ? "Confirming..." : "Confirm (deduct stock)"}
            </button>
          )}
          {challan.status !== "CANCELLED" && can(user, "SALES", "WAREHOUSE") && (
            <button className="btn btn-danger" onClick={handleCancel} disabled={actionLoading}>
              Cancel challan
            </button>
          )}
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {challan.status === "DRAFT" && (
        <div className="card card-pad" style={{ background: "var(--warning-soft)", border: "1px solid rgba(183,121,31,0.25)" }}>
          <strong style={{ color: "var(--warning)" }}>Draft — no stock impact yet.</strong>{" "}
          <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>Stock is only deducted once this challan is confirmed.</span>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3>Line items</h3>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th style={{ textAlign: "right" }}>Qty</th>
                <th style={{ textAlign: "right" }}>Unit price</th>
                <th style={{ textAlign: "right" }}>Line total</th>
              </tr>
            </thead>
            <tbody>
              {challan.items.map((item) => (
                <tr key={item.id} style={{ cursor: "default" }}>
                  <td style={{ fontWeight: 600 }}>{item.productNameSnapshot}</td>
                  <td>
                    <span className="code-chip">{item.skuSnapshot}</span>
                  </td>
                  <td className="num" style={{ textAlign: "right" }}>
                    {item.quantity}
                  </td>
                  <td className="num" style={{ textAlign: "right" }}>
                    {formatCurrency(item.unitPriceSnapshot)}
                  </td>
                  <td className="num" style={{ textAlign: "right" }}>
                    {formatCurrency(item.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} style={{ textAlign: "right", fontWeight: 700, borderBottom: "none" }}>
                  Total ({challan.totalQuantity} units)
                </td>
                <td className="num" style={{ textAlign: "right", fontWeight: 700, borderBottom: "none" }}>
                  {formatCurrency(total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <p style={{ fontSize: 12, color: "var(--slate-light)" }}>
        Product name, SKU, and price shown above are captured at the time this challan was created and won't change even if the
        product is later edited or repriced.
      </p>
    </div>
  );
}
