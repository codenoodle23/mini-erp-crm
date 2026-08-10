import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { productsApi } from "../../api/resources";
import { ApiClientError } from "../../api/client";

interface FormState {
  name: string;
  sku: string;
  category: string;
  unitPrice: string;
  currentStock: string;
  minStockAlert: string;
  location: string;
}

const initialState: FormState = {
  name: "",
  sku: "",
  category: "",
  unitPrice: "",
  currentStock: "0",
  minStockAlert: "0",
  location: "",
};

export function ProductFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(initialState);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    productsApi.get(id).then((res) => {
      const p = res.data;
      setForm({
        name: p.name,
        sku: p.sku,
        category: p.category ?? "",
        unitPrice: p.unitPrice,
        currentStock: String(p.currentStock),
        minStockAlert: String(p.minStockAlert),
        location: p.location ?? "",
      });
      setLoading(false);
    });
  }, [id]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (isEdit && id) {
        await productsApi.update(id, {
          name: form.name,
          sku: form.sku,
          category: form.category || undefined,
          unitPrice: form.unitPrice,
          minStockAlert: Number(form.minStockAlert),
          location: form.location || undefined,
        } as never);
        navigate(`/products/${id}`);
      } else {
        const res = await productsApi.create({
          name: form.name,
          sku: form.sku,
          category: form.category || undefined,
          unitPrice: form.unitPrice,
          currentStock: Number(form.currentStock),
          minStockAlert: Number(form.minStockAlert),
          location: form.location || undefined,
        } as never);
        navigate(`/products/${res.data.id}`);
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p style={{ color: "var(--slate)" }}>Loading...</p>;

  return (
    <div className="stack" style={{ maxWidth: 640 }}>
      <div className="breadcrumb">
        <Link to="/products">Inventory</Link> / {isEdit ? "Edit" : "New"}
      </div>
      <h1 style={{ fontSize: 21 }}>{isEdit ? "Edit product" : "New product"}</h1>

      {error && <div className="error-banner">{error}</div>}

      <form className="card card-pad" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field field-span-2">
            <label>Product name *</label>
            <input required value={form.name} onChange={(e) => update("name", e.target.value)} />
          </div>
          <div className="field">
            <label>SKU / code *</label>
            <input required value={form.sku} onChange={(e) => update("sku", e.target.value)} />
          </div>
          <div className="field">
            <label>Category</label>
            <input value={form.category} onChange={(e) => update("category", e.target.value)} />
          </div>
          <div className="field">
            <label>Unit price (₹) *</label>
            <input required type="number" step="0.01" min="0" value={form.unitPrice} onChange={(e) => update("unitPrice", e.target.value)} />
          </div>
          <div className="field">
            <label>{isEdit ? "Current stock" : "Opening stock"}</label>
            <input
              type="number"
              min="0"
              value={form.currentStock}
              onChange={(e) => update("currentStock", e.target.value)}
              disabled={isEdit}
            />
            {isEdit && <span className="field-hint">Adjust stock from the product page using stock movements.</span>}
          </div>
          <div className="field">
            <label>Minimum stock alert</label>
            <input type="number" min="0" value={form.minStockAlert} onChange={(e) => update("minStockAlert", e.target.value)} />
          </div>
          <div className="field">
            <label>Location / warehouse</label>
            <input value={form.location} onChange={(e) => update("location", e.target.value)} />
          </div>
        </div>

        <div className="row" style={{ marginTop: 6 }}>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Save changes" : "Create product"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
