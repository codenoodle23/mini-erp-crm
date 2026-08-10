import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { CustomersListPage } from "./pages/customers/CustomersListPage";
import { CustomerDetailPage } from "./pages/customers/CustomerDetailPage";
import { CustomerFormPage } from "./pages/customers/CustomerFormPage";
import { ProductsListPage } from "./pages/products/ProductsListPage";
import { ProductDetailPage } from "./pages/products/ProductDetailPage";
import { ProductFormPage } from "./pages/products/ProductFormPage";
import { ChallansListPage } from "./pages/challans/ChallansListPage";
import { ChallanDetailPage } from "./pages/challans/ChallanDetailPage";
import { ChallanFormPage } from "./pages/challans/ChallanFormPage";

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<DashboardPage />} />

            <Route path="/customers" element={<CustomersListPage />} />
            <Route path="/customers/new" element={<CustomerFormPage />} />
            <Route path="/customers/:id" element={<CustomerDetailPage />} />
            <Route path="/customers/:id/edit" element={<CustomerFormPage />} />

            <Route path="/products" element={<ProductsListPage />} />
            <Route path="/products/new" element={<ProductFormPage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />
            <Route path="/products/:id/edit" element={<ProductFormPage />} />

            <Route path="/challans" element={<ChallansListPage />} />
            <Route path="/challans/new" element={<ChallanFormPage />} />
            <Route path="/challans/:id" element={<ChallanDetailPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
