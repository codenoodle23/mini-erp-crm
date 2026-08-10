import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { customersApi } from "../../api/resources";
import { ApiClientError } from "../../api/client";
import { type CustomerStatus, type CustomerType } from "../../types";

interface FormState {
  name: string;
  mobile: string;
  email: string;
  businessName: string;
  gstNumber: string;
  customerType: CustomerType;
  address: string;
  status: CustomerStatus;
  followUpDate: string;
  notes: string;
}

const initialState: FormState = {
  name: "",
  mobile: "",
  email: "",
  businessName: "",
  gstNumber: "",
  customerType: "RETAIL",
  address: "",
  status: "LEAD",
  followUpDate: "",
  notes: "",
};

export function CustomerFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(initialState);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!id) return;
    customersApi.get(id).then((res) => {
      const c = res.data;
      setForm({
        name: c.name,
        mobile: c.mobile,
        email: c.email ?? "",
        businessName: c.businessName ?? "",
        gstNumber: c.gstNumber ?? "",
        customerType: c.customerType,
        address: c.address ?? "",
        status: c.status,
        followUpDate: c.followUpDate ? c.followUpDate.slice(0, 10) : "",
        notes: c.notes ?? "",
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
    setFieldErrors({});
    setSaving(true);

    const payload = {
      ...form,
      email: form.email || undefined,
      businessName: form.businessName || undefined,
      gstNumber: form.gstNumber || undefined,
      address: form.address || undefined,
      notes: form.notes || undefined,
      followUpDate: form.followUpDate || undefined,
    };

    try {
      if (isEdit && id) {
        await customersApi.update(id, payload);
        navigate(`/customers/${id}`);
      } else {
        const res = await customersApi.create(payload);
        navigate(`/customers/${res.data.id}`);
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
        if (Array.isArray(err.details)) {
          const map: Record<string, string> = {};
          for (const d of err.details as { path: string; message: string }[]) map[d.path] = d.message;
          setFieldErrors(map);
        }
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p style={{ color: "var(--slate)" }}>Loading...</p>;

  return (
    <div className="stack" style={{ maxWidth: 720 }}>
      <div className="breadcrumb">
        <Link to="/customers">Customers</Link> / {isEdit ? "Edit" : "New"}
      </div>
      <h1 style={{ fontSize: 21 }}>{isEdit ? "Edit customer" : "New customer"}</h1>

      {error && <div className="error-banner">{error}</div>}

      <form className="card card-pad" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field">
            <label>Customer name *</label>
            <input required value={form.name} onChange={(e) => update("name", e.target.value)} />
            {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
          </div>
          <div className="field">
            <label>Mobile number *</label>
            <input required value={form.mobile} onChange={(e) => update("mobile", e.target.value)} />
            {fieldErrors.mobile && <span className="field-error">{fieldErrors.mobile}</span>}
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
          </div>
          <div className="field">
            <label>Business name</label>
            <input value={form.businessName} onChange={(e) => update("businessName", e.target.value)} />
          </div>
          <div className="field">
            <label>GST number</label>
            <input value={form.gstNumber} onChange={(e) => update("gstNumber", e.target.value)} />
          </div>
          <div className="field">
            <label>Customer type</label>
            <select value={form.customerType} onChange={(e) => update("customerType", e.target.value as CustomerType)}>
              <option value="RETAIL">Retail</option>
              <option value="WHOLESALE">Wholesale</option>
              <option value="DISTRIBUTOR">Distributor</option>
            </select>
          </div>
          <div className="field">
            <label>Status</label>
            <select value={form.status} onChange={(e) => update("status", e.target.value as CustomerStatus)}>
              <option value="LEAD">Lead</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
          <div className="field">
            <label>Follow-up date</label>
            <input type="date" value={form.followUpDate} onChange={(e) => update("followUpDate", e.target.value)} />
          </div>
          <div className="field field-span-2">
            <label>Address</label>
            <input value={form.address} onChange={(e) => update("address", e.target.value)} />
          </div>
          <div className="field field-span-2">
            <label>Notes</label>
            <textarea rows={3} value={form.notes} onChange={(e) => update("notes", e.target.value)} />
          </div>
        </div>

        <div className="row" style={{ marginTop: 6 }}>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Save changes" : "Create customer"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
