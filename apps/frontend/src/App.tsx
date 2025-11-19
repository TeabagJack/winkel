import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth';

// Placeholder pages - will be built in later sprints
const LoginPage = () => <div className="p-8"><h1 className="text-2xl font-bold">Login Page</h1></div>;
const AdminDashboard = () => <div className="p-8"><h1 className="text-2xl font-bold">Admin Dashboard</h1></div>;
const UserDashboard = () => <div className="p-8"><h1 className="text-2xl font-bold">User Dashboard</h1></div>;

function App() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes */}
        <Route
          path="/admin/*"
          element={
            isAuthenticated && user?.role === 'SUPER_ADMIN' ? (
              <AdminDashboard />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/dashboard/*"
          element={
            isAuthenticated ? <UserDashboard /> : <Navigate to="/login" replace />
          }
        />

        <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
