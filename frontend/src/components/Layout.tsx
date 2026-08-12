import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { RolePill } from "./Pills";

const navItems = [
  { to: "/", label: "Dashboard", icon: "◱", end: true },
  { to: "/customers", label: "Customers", icon: "◉" },
  { to: "/products", label: "Inventory", icon: "▤" },
  { to: "/challans", label: "Sales challans", icon: "▥" },
];

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-mark">
  <img
  src="/logo-m.png"
  alt="M/ERP"
  className="brand-logo"
/>
</div>
          <div className="sidebar-brand-text">
            <strong>Mini ERP+CRM</strong>
            <span>Wholesale ops portal</span>
          </div>
        </div>

        <div className="sidebar-section-label">Workspace</div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
          >
            <span aria-hidden>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}

        <div style={{ marginTop: "auto", paddingTop: 18 }}>
          <div className="sidebar-section-label">Signed in as</div>
          <div style={{ padding: "0 10px" }}>
            <div style={{ color: "#fff", fontSize: 13.5, fontWeight: 600 }}>{user?.name}</div>
            <div style={{ marginTop: 6 }}>{user && <RolePill role={user.role} />}</div>
            <button className="btn btn-ghost btn-sm" style={{ color: "#cbd2dd", marginTop: 12, width: "100%" }} onClick={logout}>
              Log out
            </button>
          </div>
        </div>
      </aside>

      <div className="main-col">
        <header className="topbar">
          <div className="topbar-title">Operations</div>
          <div className="topbar-user">
            {user && <RolePill role={user.role} />}
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>{user?.name}</span>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
