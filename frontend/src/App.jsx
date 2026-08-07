import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import Layout from './components/common/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import SubmitReport from './pages/rm/SubmitReport';
import MyReports from './pages/rm/MyReports';
import Performance from './pages/rm/Performance';
import UserManagement from './pages/hod/UserManagement';
import DepartmentManagement from './pages/hod/DepartmentManagement';
import AllReports from './pages/hod/AllReports';
import ReportLogs from './pages/hod/ReportLogs';
import TargetManagement from './pages/hod/TargetManagement';
import LoadingSpinner from './components/common/LoadingSpinner';

const App = () => {
  const { isLoading, isAuthenticated } = useAuth();

  // Printed output (e.g. the report Print button) should always render in light mode,
  // regardless of the app's current theme — dark Tailwind classes would otherwise
  // still apply since #print-root lives under the same <html> element.
  useEffect(() => {
    const root = document.documentElement;
    const forceLight = () => {
      if (root.classList.contains('dark')) {
        root.dataset.wasDark = 'true';
        root.classList.remove('dark');
      }
    };
    const restoreTheme = () => {
      if (root.dataset.wasDark === 'true') {
        root.classList.add('dark');
        delete root.dataset.wasDark;
      }
    };
    window.addEventListener('beforeprint', forceLight);
    window.addEventListener('afterprint', restoreTheme);
    return () => {
      window.removeEventListener('beforeprint', forceLight);
      window.removeEventListener('afterprint', restoreTheme);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
      />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />

          {/* Counsellor Routes */}
          <Route
            path="/submit-report"
            element={<ProtectedRoute allowedRoles={['COUNSELLOR']}><SubmitReport /></ProtectedRoute>}
          />
          <Route
            path="/my-reports"
            element={<ProtectedRoute allowedRoles={['COUNSELLOR']}><MyReports /></ProtectedRoute>}
          />
          <Route
            path="/my-performance"
            element={<ProtectedRoute allowedRoles={['COUNSELLOR']}><Performance /></ProtectedRoute>}
          />

          {/* HOD + Super Admin Routes (reports) */}
          <Route
            path="/all-reports"
            element={<ProtectedRoute allowedRoles={['HOD', 'SUPER_ADMIN']}><AllReports /></ProtectedRoute>}
          />
          <Route
            path="/report-logs"
            element={<ProtectedRoute allowedRoles={['HOD', 'SUPER_ADMIN']}><ReportLogs /></ProtectedRoute>}
          />
          <Route
            path="/department-management"
            element={<ProtectedRoute allowedRoles={['COUNSELLOR', 'HOD', 'SUPER_ADMIN']}><DepartmentManagement /></ProtectedRoute>}
          />

          {/* Super Admin Routes */}
          <Route
            path="/user-management"
            element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><UserManagement /></ProtectedRoute>}
          />
          <Route
            path="/target-management"
            element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><TargetManagement /></ProtectedRoute>}
          />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
