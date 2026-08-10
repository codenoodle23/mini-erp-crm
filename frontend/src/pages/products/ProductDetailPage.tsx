import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { productsApi } from "../../api/resources";
import { type Product, type MovementType } from "../../types";
import { LowStockPill } from "../../components/Pills";
import { useAuth } from "../../context/AuthContext";
import { can, formatCurrency, formatDateTime } from "../../utils/helpers";
import { ApiClientError } from "../../api/client";

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [movementType, setMovementType] = useState<MovementType>("IN");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    if (!id) return;
    const res = await productsApi.get(id);
    setProduct(res.data);
    setLoading(false);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!id || !quantity || !reason.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await productsApi.recordMovement(id, { quantity: Number(quantity), movementType, reason });
      setQuantity("");
      setReason("");
      await reload();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not record stock movement.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !product) return <p style={{ color: "var(--slate)" }}>Loading...</p>;

  const isLow = product.currentStock <= product.minStockAlert;

  return (
    <div className="stack">
      <div className="breadcrumb">
        <Link to="/products">Inventory</Link> / {product.name}
      </div>

      <div className="section-title-row">
        <div>
          <div className="row" style={{ gap: 10 }}>
            <h1 style={{ fontSize: 21 }}>{product.name}</h1>
            {isLow && <LowStockPill />}
          </div>
          <span className="code-chip">{product.sku}</span>
        </div>
        {can(user, "WAREHOUSE") && (
          <button className="btn btn-secondary" onClick={() => navigate(`/products/${product.id}/edit`)}>
            Edit product
          </button>
        )}
      </div>

      <div className="grid-stats" style={{ gridTemplateColumns: "repeat(4, minmax(140px, 1fr))" }}>
        <div className="stat-card">
          <div className="stat-label">Current stock</div>
          <div className="stat-value" style={{ color: isLow ? "var(--danger)" : "var(--ink)" }}>
            {product.currentStock}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Min. alert</div>
          <div className="stat-value">{product.minStockAlert}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Unit price</div>
          <div className="stat-value" style={{ fontSize: 20 }}>
            {formatCurrency(product.unitPrice)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Location</div>
          <div className="stat-value" style={{ fontSize: 15 }}>
            {product.location ?? "—"}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: can(user, "WAREHOUSE") ? "1fr 340px" : "1fr", gap: 16, alignItems: "start" }}>
        <div className="card">
          <div className="card-header">
            <h3>Stock movement log</h3>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th style={{ textAlign: "right" }}>Qty</th>
                  <th>Reason</th>
                  <th>By</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {(!product.stockMovements || product.stockMovements.length === 0) && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", color: "var(--slate)" }}>
                      No stock movements recorded yet.
                    </td>
                  </tr>
                )}
                {product.stockMovements?.map((m) => (
                  <tr key={m.id} style={{ cursor: "default" }}>
                    <td>
                      <span className={`pill ${m.movementType === "IN" ? "pill-success" : "pill-danger"}`}>
                        <span className="pill-dot" />
                        {m.movementType}
                      </span>
                    </td>
                    <td className="num" style={{ textAlign: "right" }}>
                      {m.movementType === "IN" ? "+" : "-"}
                      {m.quantity}
                    </td>
                    <td>{m.reason}</td>
                    <td style={{ color: "var(--slate)" }}>{m.createdBy?.name ?? "—"}</td>
                    <td style={{ color: "var(--slate)" }}>{formatDateTime(m.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {can(user, "WAREHOUSE") && (
          <div className="card card-pad">
            <h3 style={{ fontSize: 14, marginBottom: 12 }}>Record stock movement</h3>
            {error && <div className="error-banner">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Movement type</label>
                <select value={movementType} onChange={(e) => setMovementType(e.target.value as MovementType)}>
                  <option value="IN">IN — stock received</option>
                  <option value="OUT">OUT — stock removed</option>
                </select>
              </div>
              <div className="field">
                <label>Quantity</label>
                <input type="number" min="1" required value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
              <div className="field">
                <label>Reason</label>
                <input required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. New shipment, stock take correction" />
              </div>
              <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: "100%" }}>
                {submitting ? "Saving..." : "Record movement"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
