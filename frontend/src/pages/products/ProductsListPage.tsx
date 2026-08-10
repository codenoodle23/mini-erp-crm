import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { productsApi } from "../../api/resources";
import { type Paginated, type Product } from "../../types";
import { LowStockPill } from "../../components/Pills";
import { PaginationBar } from "../../components/PaginationBar";
import { useAuth } from "../../context/AuthContext";
import { can, formatCurrency } from "../../utils/helpers";

export function ProductsListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [result, setResult] = useState<Paginated<Product> | null>(null);
  const [search, setSearch] = useState("");
  const [lowStock, setLowStock] = useState(searchParams.get("lowStock") === "true");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    productsApi.list({ page, search, lowStock }).then((res) => {
      if (!cancelled) {
        setResult(res);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [page, search, lowStock]);

  return (
    <div className="stack">
      <div className="section-title-row">
        <div>
          <h1 style={{ fontSize: 21, marginBottom: 4 }}>Inventory</h1>
          <p style={{ color: "var(--slate)", fontSize: 13.5, margin: 0 }}>Products, stock levels, and warehouse locations.</p>
        </div>
        {can(user, "WAREHOUSE") && (
          <button className="btn btn-primary" onClick={() => navigate("/products/new")}>
            + New product
          </button>
        )}
      </div>

      <div className="card">
        <div className="card-header" style={{ gap: 10, flexWrap: "wrap" }}>
          <input
            placeholder="Search name or SKU..."
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            style={{ flex: 1, minWidth: 220, border: "1px solid var(--line)", borderRadius: 6, padding: "8px 11px", fontSize: 13.5 }}
          />
          <label className="row" style={{ fontSize: 13, gap: 6, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={lowStock}
              onChange={(e) => {
                setPage(1);
                setLowStock(e.target.checked);
                setSearchParams(e.target.checked ? { lowStock: "true" } : {});
              }}
            />
            Low stock only
          </label>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Location</th>
                <th style={{ textAlign: "right" }}>Unit price</th>
                <th style={{ textAlign: "right" }}>Stock</th>
              </tr>
            </thead>
            <tbody>
              {!loading && result?.data.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <h3>No products found</h3>
                      <p>Try clearing filters, or add a new product.</p>
                    </div>
                  </td>
                </tr>
              )}
              {result?.data.map((p) => (
                <tr key={p.id} onClick={() => navigate(`/products/${p.id}`)}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td>
                    <span className="code-chip">{p.sku}</span>
                  </td>
                  <td>{p.category ?? "—"}</td>
                  <td style={{ color: "var(--slate)" }}>{p.location ?? "—"}</td>
                  <td className="num" style={{ textAlign: "right" }}>
                    {formatCurrency(p.unitPrice)}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div className="row" style={{ justifyContent: "flex-end", gap: 6 }}>
                      <span className="num" style={{ fontWeight: 600 }}>
                        {p.currentStock}
                      </span>
                      {p.currentStock <= p.minStockAlert && <LowStockPill />}
                    </div>
                  </td>
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
