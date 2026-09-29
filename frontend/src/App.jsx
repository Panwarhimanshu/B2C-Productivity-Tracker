import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { HOD_LIKE_ROLES, REPORT_SUBMITTER_ROLES } from './utils/constants';
import ProtectedRoute from './components/common/ProtectedRoute';
import Layout from './components/common/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Attendance from './pages/Attendance';
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
          <Route path="/attendance" element={<Attendance />} />

          {/* Report-submitting roles: Counsellor, Onshore Counsellor, Associate HOD */}
          <Route
            path="/submit-report"
            element={<ProtectedRoute allowedRoles={REPORT_SUBMITTER_ROLES}><SubmitReport /></ProtectedRoute>}
          />
          <Route
            path="/my-reports"
            element={<ProtectedRoute allowedRoles={REPORT_SUBMITTER_ROLES}><MyReports /></ProtectedRoute>}
          />
          <Route
            path="/my-performance"
            element={<ProtectedRoute allowedRoles={REPORT_SUBMITTER_ROLES}><Performance /></ProtectedRoute>}
          />

          {/* HOD-like (HOD, Associate HOD) + Super Admin Routes (department-wide reports) */}
          <Route
            path="/all-reports"
            element={<ProtectedRoute allowedRoles={[...HOD_LIKE_ROLES, 'SUPER_ADMIN']}><AllReports /></ProtectedRoute>}
          />
          <Route
            path="/report-logs"
            element={<ProtectedRoute allowedRoles={[...HOD_LIKE_ROLES, 'SUPER_ADMIN']}><ReportLogs /></ProtectedRoute>}
          />
          <Route
            path="/department-management"
            element={<ProtectedRoute><DepartmentManagement /></ProtectedRoute>}
          />

          {/* Super Admin Routes */}
          <Route
            path="/user-management"
            element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><UserManagement /></ProtectedRoute>}
          />
          <Route
            path="/target-management"
            element={<ProtectedRoute allowedRoles={['HOD', 'SUPER_ADMIN']}><TargetManagement /></ProtectedRoute>}
          />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
