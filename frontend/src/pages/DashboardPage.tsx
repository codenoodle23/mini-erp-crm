import { type CSSProperties } from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  challansApi,
  customersApi,
  productsApi,
} from "../api/resources";

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

      const [
        customers,
        leads,
        products,
        lowStockProducts,
        drafts,
        recent,
      ] = await Promise.all([
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

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-orbit">◈</div>
        <div>
          <strong>Initializing operations</strong>
          <span>Loading workspace data...</span>
        </div>
      </div>
    );
  }

  const inventoryHealth =
    productTotal === 0
      ? 100
      : Math.max(
          0,
          Math.round(
            ((productTotal - lowStock.length) / productTotal) * 100
          )
        );

  return (
    <div className="dashboard-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <section className="dashboard-hero">

        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            OPERATIONS CENTER
          </div>

          <h1>Dashboard</h1>

          <p>
            Real-time snapshot of your customers, inventory,
            and sales operations.
          </p>
        </div>

        <div className="dashboard-actions">

          <Link
            to="/customers/new"
            className="dashboard-action secondary"
          >
            <span>+</span>
            Customer
          </Link>

          <Link
            to="/products/new"
            className="dashboard-action secondary"
          >
            <span>+</span>
            Product
          </Link>

          <Link
            to="/challans/new"
            className="dashboard-action primary"
          >
            <span>+</span>
            New challan
          </Link>

        </div>

      </section>


      {/* =====================================================
          KPI CARDS
      ===================================================== */}

      <section className="dashboard-kpis">

        <div className="dashboard-kpi">

          <div className="dashboard-kpi-top">
            <span className="dashboard-kpi-icon">
              ◉
            </span>

            <span className="dashboard-kpi-label">
              CUSTOMERS
            </span>
          </div>

          <strong>{customerTotal}</strong>

          <span className="dashboard-kpi-description">
            Active customer records
          </span>

        </div>


        <div className="dashboard-kpi">

          <div className="dashboard-kpi-top">
            <span className="dashboard-kpi-icon purple">
              ◌
            </span>

            <span className="dashboard-kpi-label">
              OPEN LEADS
            </span>
          </div>

          <strong>{leadTotal}</strong>

          <span className="dashboard-kpi-description">
            Customers requiring follow-up
          </span>

        </div>


        <div className="dashboard-kpi">

          <div className="dashboard-kpi-top">
            <span className="dashboard-kpi-icon">
              ◈
            </span>

            <span className="dashboard-kpi-label">
              INVENTORY
            </span>
          </div>

          <strong>{productTotal}</strong>

          <span className="dashboard-kpi-description">
            Products currently tracked
          </span>

        </div>


        <div
          className={`dashboard-kpi ${
            lowStock.length > 0 ? "danger" : ""
          }`}
        >

          <div className="dashboard-kpi-top">
            <span className="dashboard-kpi-icon red">
              !
            </span>

            <span className="dashboard-kpi-label">
              STOCK ALERTS
            </span>
          </div>

          <strong>{lowStock.length}</strong>

          <span className="dashboard-kpi-description">
            Products below threshold
          </span>

        </div>


        <div className="dashboard-kpi">

          <div className="dashboard-kpi-top">
            <span className="dashboard-kpi-icon yellow">
              ◇
            </span>

            <span className="dashboard-kpi-label">
              DRAFTS
            </span>
          </div>

          <strong>{draftTotal}</strong>

          <span className="dashboard-kpi-description">
            Challans awaiting confirmation
          </span>

        </div>

      </section>


      {/* =====================================================
          MAIN OPERATIONS GRID
      ===================================================== */}

      <section className="dashboard-main-grid">

        {/* RECENT CHALLANS */}

        <div className="dashboard-panel dashboard-challans">

          <div className="dashboard-panel-header">

            <div>
              <span className="panel-eyebrow">
                SALES ACTIVITY
              </span>

              <h2>Recent challans</h2>
            </div>

            <Link
              to="/challans"
              className="panel-link"
            >
              View all →
            </Link>

          </div>


          <div className="dashboard-table-wrap">

            <table className="data-table dashboard-table">

              <thead>
                <tr>
                  <th>CHALLAN</th>
                  <th>CUSTOMER</th>
                  <th>STATUS</th>
                  <th>QTY</th>
                  <th>DATE</th>
                </tr>
              </thead>

              <tbody>

                {recentChallans.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="dashboard-empty"
                    >
                      No sales challans yet.
                    </td>
                  </tr>
                )}

                {recentChallans.map((challan) => (

                  <tr
                    key={challan.id}
                    className="dashboard-table-row"
                    onClick={() => {
                      window.location.href =
                        `/challans/${challan.id}`;
                    }}
                  >

                    <td>
                      <span className="dashboard-code">
                        {challan.challanNumber}
                      </span>
                    </td>

                    <td>
                      <strong>
                        {challan.customer?.name}
                      </strong>
                    </td>

                    <td>
                      <ChallanStatusPill
                        status={challan.status}
                      />
                    </td>

                    <td className="num dashboard-qty">
                      {challan.totalQuantity}
                    </td>

                    <td className="dashboard-date">
                      {formatDateTime(challan.createdAt)}
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </div>


        {/* INVENTORY HEALTH */}

        <div className="dashboard-panel inventory-health">

          <div className="dashboard-panel-header">

            <div>
              <span className="panel-eyebrow">
                INVENTORY STATUS
              </span>

              <h2>Inventory health</h2>
            </div>

            <Link
              to="/products"
              className="panel-link"
            >
              Manage →
            </Link>

          </div>


          <div className="health-content">

            <div
  className="health-ring"
  style={
    {
      "--health": inventoryHealth,
    } as CSSProperties
  }
>

              <div className="health-ring-inner">

                <strong>
                  {inventoryHealth}%
                </strong>

                <span>
                  HEALTHY
                </span>

              </div>

            </div>


            <div className="health-details">

              <div className="health-row">
                <span>
                  <i className="health-dot healthy" />
                  Healthy
                </span>

                <strong>
                  {Math.max(
                    productTotal - lowStock.length,
                    0
                  )}
                </strong>
              </div>


              <div className="health-row">
                <span>
                  <i className="health-dot warning" />
                  Low stock
                </span>

                <strong>
                  {lowStock.length}
                </strong>
              </div>


              <div className="health-row">
                <span>
                  <i className="health-dot danger" />
                  Critical
                </span>

                <strong>
                  {lowStock.filter(
                    (product) =>
                      product.currentStock <=
                      product.minStockAlert / 2
                  ).length}
                </strong>
              </div>

            </div>

          </div>


          <Link
            to="/products?lowStock=true"
            className="inventory-alert-link"
          >
            <span>View stock alerts</span>
            <span>→</span>
          </Link>

        </div>

      </section>


      {/* =====================================================
          LOWER OPERATIONS AREA
      ===================================================== */}

      <section className="dashboard-lower-grid">

        {/* LOW STOCK */}

        <div className="dashboard-panel">

          <div className="dashboard-panel-header">

            <div>
              <span className="panel-eyebrow">
                ATTENTION REQUIRED
              </span>

              <h2>Low stock alerts</h2>
            </div>

            <Link
              to="/products?lowStock=true"
              className="panel-link"
            >
              View all →
            </Link>

          </div>


          <div className="stock-list">

            {lowStock.length === 0 && (
              <div className="stock-empty">
                <span>✓</span>
                <div>
                  <strong>Inventory is healthy</strong>
                  <p>
                    All tracked products are above
                    their minimum threshold.
                  </p>
                </div>
              </div>
            )}


            {lowStock.slice(0, 4).map((product) => {

              const percentage =
                product.minStockAlert > 0
                  ? Math.min(
                      100,
                      Math.round(
                        (product.currentStock /
                          product.minStockAlert) *
                          100
                      )
                    )
                  : 100;

              return (
                <Link
                  key={product.id}
                  to={`/products/${product.id}`}
                  className="stock-item"
                >

                  <div className="stock-item-main">

                    <div>
                      <strong>
                        {product.name}
                      </strong>

                      <span className="dashboard-code">
                        {product.sku}
                      </span>
                    </div>

                    <div className="stock-number">
                      <strong>
                        {product.currentStock}
                      </strong>

                      <span>
                        / {product.minStockAlert}
                      </span>
                    </div>

                  </div>


                  <div className="stock-progress">

                    <span
                      style={{
                        width: `${percentage}%`,
                      }}
                    />

                  </div>

                </Link>
              );
            })}

          </div>

        </div>


        {/* QUICK ACTIONS */}

        <div className="dashboard-panel quick-actions">

          <div className="dashboard-panel-header">

            <div>
              <span className="panel-eyebrow">
                WORKSPACE
              </span>

              <h2>Quick actions</h2>
            </div>

          </div>


          <div className="quick-action-grid">

            <Link
              to="/customers/new"
              className="quick-action"
            >
              <span className="quick-action-icon">
                ◎
              </span>

              <div>
                <strong>
                  Add customer
                </strong>

                <span>
                  Create a new account
                </span>
              </div>

              <span className="quick-arrow">
                →
              </span>
            </Link>


            <Link
              to="/products/new"
              className="quick-action"
            >
              <span className="quick-action-icon">
                ◈
              </span>

              <div>
                <strong>
                  Add product
                </strong>

                <span>
                  Add inventory to catalog
                </span>
              </div>

              <span className="quick-arrow">
                →
              </span>
            </Link>


            <Link
              to="/challans/new"
              className="quick-action"
            >
              <span className="quick-action-icon">
                ◇
              </span>

              <div>
                <strong>
                  Create challan
                </strong>

                <span>
                  Start a new sales order
                </span>
              </div>

              <span className="quick-arrow">
                →
              </span>
            </Link>

          </div>

        </div>

      </section>

    </div>
  );
}