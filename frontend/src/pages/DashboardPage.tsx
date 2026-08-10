import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { challansApi, customersApi, productsApi } from "../api/resources";
import { type Challan, type Product } from "../types";
import { ChallanStatusPill } from "../components/Pills";
import { formatDateTime } from "../utils/helpers";

export function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [customerTotal, setCustomerTotal] = useState(0);
  const [leadTotal, setLeadTotal] = useState(0);
  const [productTotal, setProductTotal] = useState(0);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [draftTotal, setDraftTotal] = useState(0);
  const [recentChallans, setRecentChallans] = useState<Challan[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [customers, leads, products, lowStockProducts, drafts, recent] = await Promise.all([
        customersApi.list({ page: 1 }),
        customersApi.list({ page: 1, status: "LEAD" }),
        productsApi.list({ page: 1 }),
        productsApi.list({ page: 1, lowStock: true }),
        challansApi.list({ page: 1, status: "DRAFT" }),
        challansApi.list({ page: 1 }),
      ]);
      if (cancelled) return;
      setCustomerTotal(customers.pagination.total);
      setLeadTotal(leads.pagination.total);
      setProductTotal(products.pagination.total);
      setLowStock(lowStockProducts.data);
      setDraftTotal(drafts.pagination.total);
      setRecentChallans(recent.data.slice(0, 6));
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <p style={{ color: "var(--slate)" }}>Loading dashboard...</p>;

  return (
    <div className="stack">
      <div>
        <h1 style={{ fontSize: 21, marginBottom: 4 }}>Dashboard</h1>
        <p style={{ color: "var(--slate)", fontSize: 13.5, margin: 0 }}>Snapshot of customers, inventory, and open challans.</p>
      </div>

      <div className="grid-stats">
        <div className="stat-card">
          <div className="stat-label">Total customers</div>
          <div className="stat-value">{customerTotal}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Open leads</div>
          <div className="stat-value">{leadTotal}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Products tracked</div>
          <div className="stat-value">{productTotal}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Low stock alerts</div>
          <div className="stat-value" style={{ color: lowStock.length > 0 ? "var(--danger)" : "var(--ink)" }}>
            {lowStock.length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Draft challans</div>
          <div className="stat-value">{draftTotal}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
        <div className="card">
          <div className="card-header">
            <h3>Recent sales challans</h3>
            <Link to="/challans" className="btn btn-ghost btn-sm">
              View all
            </Link>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Challan #</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Qty</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentChallans.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", color: "var(--slate)" }}>
                      No challans yet.
                    </td>
                  </tr>
                )}
                {recentChallans.map((c) => (
                  <tr key={c.id} onClick={() => (window.location.href = `/challans/${c.id}`)}>
                    <td>
                      <span className="code-chip">{c.challanNumber}</span>
                    </td>
                    <td>{c.customer?.name}</td>
                    <td>
                      <ChallanStatusPill status={c.status} />
                    </td>
                    <td className="num" style={{ textAlign: "right" }}>
                      {c.totalQuantity}
                    </td>
                    <td style={{ color: "var(--slate)" }}>{formatDateTime(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Low stock alerts</h3>
            <Link to="/products?lowStock=true" className="btn btn-ghost btn-sm">
              View all
            </Link>
          </div>
          <div className="stack" style={{ padding: "14px 22px", gap: 10 }}>
            {lowStock.length === 0 && <p style={{ color: "var(--slate)", fontSize: 13 }}>Everything is above threshold.</p>}
            {lowStock.slice(0, 6).map((p) => (
              <div key={p.id} className="row-between" style={{ fontSize: 13 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <span className="code-chip">{p.sku}</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="num" style={{ color: "var(--danger)", fontWeight: 700 }}>
                    {p.currentStock}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--slate-light)" }}>min {p.minStockAlert}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
