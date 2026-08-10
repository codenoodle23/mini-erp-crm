import { type ChallanStatus, type CustomerStatus, type Role } from "../types";

const customerStatusMap: Record<CustomerStatus, string> = {
  LEAD: "pill-info",
  ACTIVE: "pill-success",
  INACTIVE: "pill-neutral",
};

const challanStatusMap: Record<ChallanStatus, string> = {
  DRAFT: "pill-warning",
  CONFIRMED: "pill-success",
  CANCELLED: "pill-danger",
};

export function CustomerStatusPill({ status }: { status: CustomerStatus }) {
  return (
    <span className={`pill ${customerStatusMap[status]}`}>
      <span className="pill-dot" />
      {status}
    </span>
  );
}

export function ChallanStatusPill({ status }: { status: ChallanStatus }) {
  return (
    <span className={`pill ${challanStatusMap[status]}`}>
      <span className="pill-dot" />
      {status}
    </span>
  );
}

export function RolePill({ role }: { role: Role }) {
  return <span className="role-pill">{role}</span>;
}

export function LowStockPill() {
  return (
    <span className="pill pill-danger">
      <span className="pill-dot" />
      Low stock
    </span>
  );
}
