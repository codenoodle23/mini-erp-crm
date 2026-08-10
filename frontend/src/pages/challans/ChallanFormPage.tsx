import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { challansApi, customersApi, productsApi } from "../../api/resources";
import { type Customer, type Product } from "../../types";
import { ApiClientError } from "../../api/client";
import { formatCurrency } from "../../utils/helpers";

interface Line {
  productId: string;
  quantity: string;
}

export function ChallanFormPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [lines, setLines] = useState<Line[]>([{ productId: "", quantity: "1" }]);
  const [saving, setSaving] = useState<"DRAFT" | "CONFIRMED" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    customersApi.list({ page: 1, pageSize: 100 } as never).then((res) => setCustomers(res.data));
    productsApi.list({ page: 1 } as never).then((res) => setProducts(res.data));
  }, []);

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((ls) => [...ls, { productId: "", quantity: "1" }]);
  }

  function removeLine(index: number) {
    setLines((ls) => ls.filter((_, i) => i !== index));
  }

  function productFor(id: string) {
    return products.find((p) => p.id === id);
  }

  const validLines = lines.filter((l) => l.productId && Number(l.quantity) > 0);
  const total = validLines.reduce((sum, l) => {
    const p = productFor(l.productId);
    return sum + (p ? Number(p.unitPrice) * Number(l.quantity) : 0);
  }, 0);

  async function handleSubmit(e: FormEvent, status: "DRAFT" | "CONFIRMED") {
    e.preventDefault();
    setError(null);
    if (!customerId) {
      setError("Please select a customer.");
      return;
    }
    if (validLines.length === 0) {
      setError("Add at least one product line with a quantity.");
      return;
    }

    setSaving(status);
    try {
      const res = await challansApi.create({
        customerId,
        items: validLines.map((l) => ({ productId: l.productId, quantity: Number(l.quantity) })),
        status,
      });
      navigate(`/challans/${res.data.id}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not create the challan.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="stack" style={{ maxWidth: 800 }}>
      <div className="breadcrumb">
        <Link to="/challans">Sales challans</Link> / New
      </div>
      <h1 style={{ fontSize: 21 }}>New sales challan</h1>

      {error && <div className="error-banner">{error}</div>}

      <form className="card card-pad stack">
        <div className="field" style={{ maxWidth: 380 }}>
          <label>Customer *</label>
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Select a customer...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.businessName ? `(${c.businessName})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="row-between" style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--slate)" }}>Products</label>
            <button type="button" className="btn btn-ghost btn-sm" onClick={addLine}>
              + Add line
            </button>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: "45%" }}>Product</th>
                  <th style={{ width: 110 }}>Quantity</th>
                  <th>Unit price</th>
                  <th style={{ textAlign: "right" }}>Line total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, i) => {
                  const p = productFor(line.productId);
                  const qty = Number(line.quantity) || 0;
                  const exceedsStock = p ? qty > p.currentStock : false;
                  return (
                    <tr key={i} style={{ cursor: "default" }}>
                      <td>
                        <select value={line.productId} onChange={(e) => updateLine(i, { productId: e.target.value })} style={{ width: "100%" }}>
                          <option value="">Select product...</option>
                          {products.map((prod) => (
                            <option key={prod.id} value={prod.id}>
                              {prod.name} ({prod.sku}) — {prod.currentStock} in stock
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          value={line.quantity}
                          onChange={(e) => updateLine(i, { quantity: e.target.value })}
                          style={{ width: 90, border: "1px solid var(--line)", borderRadius: 6, padding: "6px 8px" }}
                        />
                        {exceedsStock && <div style={{ fontSize: 11, color: "var(--danger)", marginTop: 3 }}>exceeds stock</div>}
                      </td>
                      <td className="num">{p ? formatCurrency(p.unitPrice) : "—"}</td>
                      <td className="num" style={{ textAlign: "right" }}>
                        {p ? formatCurrency(Number(p.unitPrice) * qty) : "—"}
                      </td>
                      <td>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeLine(i)} disabled={lines.length === 1}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="row-between" style={{ padding: "12px 4px 0", fontSize: 14 }}>
            <span style={{ color: "var(--slate)" }}>
              Total quantity: <strong style={{ color: "var(--ink)" }}>{validLines.reduce((s, l) => s + Number(l.quantity), 0)}</strong>
            </span>
            <span>
              Total value: <strong className="num">{formatCurrency(total)}</strong>
            </span>
          </div>
        </div>

        <div className="row" style={{ marginTop: 6 }}>
          <button className="btn btn-secondary" disabled={saving !== null} onClick={(e) => handleSubmit(e, "DRAFT")}>
            {saving === "DRAFT" ? "Saving..." : "Save as draft"}
          </button>
          <button className="btn btn-primary" disabled={saving !== null} onClick={(e) => handleSubmit(e, "CONFIRMED")}>
            {saving === "CONFIRMED" ? "Confirming..." : "Save & confirm (deducts stock)"}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
