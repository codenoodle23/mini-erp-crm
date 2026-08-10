import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { customersApi } from "../../api/resources";
import { type Customer } from "../../types";
import { CustomerStatusPill, ChallanStatusPill } from "../../components/Pills";
import { useAuth } from "../../context/AuthContext";
import { can, formatDate, formatDateTime } from "../../utils/helpers";
import { ApiClientError } from "../../api/client";

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    if (!id) return;
    const res = await customersApi.get(id);
    setCustomer(res.data);
    setLoading(false);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleAddNote(e: FormEvent) {
    e.preventDefault();
    if (!id || !note.trim()) return;
    setSubmittingNote(true);
    setError(null);
    try {
      await customersApi.addFollowUp(id, { note, followUpDate: followUpDate || undefined });
      setNote("");
      setFollowUpDate("");
      await reload();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not add follow-up.");
    } finally {
      setSubmittingNote(false);
    }
  }

  if (loading || !customer) return <p style={{ color: "var(--slate)" }}>Loading...</p>;

  return (
    <div className="stack">
      <div className="breadcrumb">
        <Link to="/customers">Customers</Link> / {customer.name}
      </div>

      <div className="section-title-row">
        <div>
          <div className="row" style={{ gap: 10 }}>
            <h1 style={{ fontSize: 21 }}>{customer.name}</h1>
            <CustomerStatusPill status={customer.status} />
          </div>
          {customer.businessName && <p style={{ color: "var(--slate)", margin: "2px 0 0" }}>{customer.businessName}</p>}
        </div>
        {can(user, "SALES") && (
          <button className="btn btn-secondary" onClick={() => navigate(`/customers/${customer.id}/edit`)}>
            Edit customer
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 16, alignItems: "start" }}>
        <div className="card card-pad stack" style={{ gap: 10 }}>
          <h3 style={{ fontSize: 14, marginBottom: 4 }}>Contact details</h3>
          <DetailRow label="Mobile" value={customer.mobile} mono />
          <DetailRow label="Email" value={customer.email || "—"} />
          <DetailRow label="Customer type" value={customer.customerType} />
          <DetailRow label="GST number" value={customer.gstNumber || "—"} mono />
          <DetailRow label="Address" value={customer.address || "—"} />
          <DetailRow label="Next follow-up" value={formatDate(customer.followUpDate)} />
          <DetailRow label="Added by" value={customer.createdBy?.name ?? "—"} />
          {customer.notes && (
            <div>
              <div style={{ fontSize: 11.5, color: "var(--slate)", fontWeight: 600, marginBottom: 4 }}>NOTES</div>
              <p style={{ fontSize: 13.5, margin: 0 }}>{customer.notes}</p>
            </div>
          )}
        </div>

        <div className="stack">
          <div className="card">
            <div className="card-header">
              <h3>Follow-up history</h3>
            </div>
            {can(user, "SALES") && (
              <form onSubmit={handleAddNote} style={{ padding: "16px 22px", borderBottom: "1px solid var(--line-soft)" }}>
                {error && <div className="error-banner">{error}</div>}
                <div className="field">
                  <label>Add a follow-up note</label>
                  <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Called about pricing, will follow up Friday..." />
                </div>
                <div className="row">
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    style={{ border: "1px solid var(--line)", borderRadius: 6, padding: "7px 10px", fontSize: 13 }}
                  />
                  <button className="btn btn-primary btn-sm" type="submit" disabled={submittingNote || !note.trim()}>
                    Add note
                  </button>
                </div>
              </form>
            )}
            <div className="stack" style={{ padding: "16px 22px", gap: 14 }}>
              {(!customer.followUps || customer.followUps.length === 0) && (
                <p style={{ color: "var(--slate)", fontSize: 13 }}>No follow-ups logged yet.</p>
              )}
              {customer.followUps?.map((f) => (
                <div key={f.id} style={{ borderLeft: "2px solid var(--accent)", paddingLeft: 12 }}>
                  <p style={{ fontSize: 13.5, margin: 0 }}>{f.note}</p>
                  <div style={{ fontSize: 11.5, color: "var(--slate-light)", marginTop: 4 }}>
                    {f.createdBy?.name} · {formatDateTime(f.createdAt)}
                    {f.followUpDate && ` · next: ${formatDate(f.followUpDate)}`}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Sales challans</h3>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Challan #</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Qty</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(!customer.challans || customer.challans.length === 0) && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center", color: "var(--slate)" }}>
                        No challans for this customer yet.
                      </td>
                    </tr>
                  )}
                  {customer.challans?.map((c) => (
                    <tr key={c.id} onClick={() => navigate(`/challans/${c.id}`)}>
                      <td>
                        <span className="code-chip">{c.challanNumber}</span>
                      </td>
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
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="row-between" style={{ fontSize: 13.5 }}>
      <span style={{ color: "var(--slate)" }}>{label}</span>
      <span className={mono ? "num" : ""} style={{ fontWeight: 500, textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}
