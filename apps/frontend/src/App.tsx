import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import { Toaster } from './components/ui/toaster';
import { Toaster as SonnerToaster } from 'sonner';

// Pages
import LoginPage from './pages/Login';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import ProductsPage from './pages/admin/Products';
import ProductForm from './pages/admin/ProductForm';
import CategoriesPage from './pages/admin/Categories';
import CategoryForm from './pages/admin/CategoryForm';
import OrdersPage from './pages/admin/Orders';
import OrderDetailsPage from './pages/admin/OrderDetails';
import CustomersPage from './pages/admin/Customers';
import CustomerDetailsPage from './pages/admin/CustomerDetails';
import InventoryAlertsPage from './pages/admin/InventoryAlerts';
import EmailPreferencesPage from './pages/admin/EmailPreferences';
import QuotesPage from './pages/admin/Quotes';
import QuoteDetailsPage from './pages/admin/QuoteDetails';

// Protected Route Component
function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole?: string }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function App() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate
                to={user?.role === 'SUPER_ADMIN' ? '/admin/dashboard' : '/dashboard'}
                replace
              />
            ) : (
              <LoginPage />
            )
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="SUPER_ADMIN">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/new" element={<ProductForm />} />
          <Route path="products/:id" element={<ProductForm />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="categories/new" element={<CategoryForm />} />
          <Route path="categories/:id" element={<CategoryForm />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/:id" element={<OrderDetailsPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="customers/:id" element={<CustomerDetailsPage />} />
          <Route path="inventory" element={<InventoryAlertsPage />} />
          <Route path="email-preferences" element={<EmailPreferencesPage />} />
          <Route path="quotes" element={<QuotesPage />} />
          <Route path="quotes/:id" element={<QuoteDetailsPage />} />
          <Route
            path="analytics"
            element={
              <div className="p-8">
                <h1 className="text-3xl font-bold">Analytics</h1>
                <p className="text-muted-foreground mt-2">Coming soon...</p>
              </div>
            }
          />
          <Route
            path="settings"
            element={
              <div className="p-8">
                <h1 className="text-3xl font-bold">Settings</h1>
                <p className="text-muted-foreground mt-2">Coming soon...</p>
              </div>
            }
          />
        </Route>

        {/* User Dashboard Routes (For B2B Buyers) */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <div className="min-h-screen p-8">
                <h1 className="text-3xl font-bold">User Dashboard</h1>
                <p className="text-muted-foreground mt-2">
                  B2B buyer dashboard coming in next sprint...
                </p>
              </div>
            </ProtectedRoute>
          }
        />

        {/* Root redirect */}
        <Route
          path="/"
          element={
            <Navigate
              to={
                isAuthenticated
                  ? user?.role === 'SUPER_ADMIN'
                    ? '/admin/dashboard'
                    : '/dashboard'
                  : '/login'
              }
              replace
            />
          }
        />

        {/* 404 */}
        <Route
          path="*"
          element={
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-4xl font-bold">404</h1>
                <p className="text-muted-foreground mt-2">Page not found</p>
              </div>
            </div>
          }
        />
      </Routes>
      <Toaster />
      <SonnerToaster position="top-right" richColors />
    </BrowserRouter>
  );
}

export default App;
