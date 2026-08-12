import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { customersApi } from "../../api/resources";
import { type Customer, type CustomerStatus, type CustomerType, type Paginated } from "../../types";
import { CustomerStatusPill } from "../../components/Pills";
import { PaginationBar } from "../../components/PaginationBar";
import { useAuth } from "../../context/AuthContext";
import { can } from "../../utils/helpers";

export function CustomersListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [result, setResult] = useState<Paginated<Customer> | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CustomerStatus | "">("");
  const [customerType, setCustomerType] = useState<CustomerType | "">("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    customersApi.list({ page, search, status, customerType }).then((res) => {
      if (!cancelled) {
        setResult(res);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [page, search, status, customerType]);

  return (
    <div className="stack customers-page">
      <div className="section-title-row">
        <div>
          <div className="customers-heading">

  <div className="customers-eyebrow">
    <span className="customers-eyebrow-dot" />
    CUSTOMER RELATIONSHIP MANAGEMENT
  </div>

  <h1>Customers</h1>

  <p>
    Leads, active accounts, and distributor relationships.
  </p>

</div>
        </div>
        {can(user, "SALES") && (
          <button
  className="btn btn-primary customer-create-btn"
  onClick={() => navigate("/customers/new")}
>
  <span>+</span>
  New customer
</button>
        )}
      </div>

      <div className="card customers-card">
        <div className="card-header customers-filters">
          <input
  className="customer-search"
  placeholder="Search name, mobile, email, business..."
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            
          />
          <select
  className="customer-filter"
  value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value as CustomerStatus | "");
            }}
          >
            <option value="">All statuses</option>
            <option value="LEAD">Lead</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <select
  className="customer-filter"
  value={customerType}
            onChange={(e) => {
              setPage(1);
              setCustomerType(e.target.value as CustomerType | "");
            }}
          >
            <option value="">All types</option>
            <option value="RETAIL">Retail</option>
            <option value="WHOLESALE">Wholesale</option>
            <option value="DISTRIBUTOR">Distributor</option>
          </select>
        </div>

        <div className="table-wrap">
          <table className="data-table customers-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Mobile</th>
                <th>Type</th>
                <th>Status</th>
                <th>Follow-up</th>
                <th>Created by</th>
              </tr>
            </thead>
            <tbody>
              {!loading && result?.data.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <h3>No customers found</h3>
                      <p>Try clearing filters, or add a new customer.</p>
                    </div>
                  </td>
                </tr>
              )}
              {result?.data.map((c) => (
                <tr
  key={c.id}
  className="customer-row"
  onClick={() => navigate(`/customers/${c.id}`)}
>
                  <td>
  <div className="customer-identity">

    <div className="customer-avatar">
      {c.name.charAt(0).toUpperCase()}
    </div>

    <div className="customer-name-block">

      <strong>{c.name}</strong>

      {c.businessName && (
        <span>{c.businessName}</span>
      )}

    </div>

  </div>
</td>
                  <td className="num">{c.mobile}</td>
                  <td>{c.customerType}</td>
                  <td>
                    <CustomerStatusPill status={c.status} />
                  </td>
                  <td style={{ color: "var(--slate)" }}>
                    {c.followUpDate ? new Date(c.followUpDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}
                  </td>
                  <td style={{ color: "var(--slate)" }}>{c.createdBy?.name ?? "—"}</td>
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
