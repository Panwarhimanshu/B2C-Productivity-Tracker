import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Users, MapPin,
  ClipboardList, TrendingUp, Building2, ChevronLeft, ChevronRight, Target, History,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS } from '../../utils/constants';
import { classNames } from '../../utils/helpers';

const navByRole = {
  COUNSELLOR: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/submit-report', icon: FileText, label: 'Submit Report' },
    { to: '/my-reports', icon: ClipboardList, label: 'My Reports' },
    { to: '/my-performance', icon: TrendingUp, label: 'Performance' },
    { to: '/profile', icon: Users, label: 'Profile' },
  ],
  HOD: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/all-reports', icon: ClipboardList, label: 'All Reports' },
    { to: '/report-logs', icon: History, label: 'Report Logs' },
    { to: '/profile', icon: Users, label: 'Profile' },
  ],
  SUPER_ADMIN: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/org-dashboard', icon: Building2, label: 'Org Dashboard' },
    { to: '/all-reports', icon: ClipboardList, label: 'All Reports' },
    { to: '/report-logs', icon: History, label: 'Report Logs' },
    { to: '/user-management', icon: Users, label: 'User Management' },
    { to: '/department-management', icon: MapPin, label: 'Department Management' },
    { to: '/target-management', icon: Target, label: 'Monthly Targets' },
    { to: '/profile', icon: Users, label: 'Profile' },
  ],
};

const Sidebar = ({ collapsed, onToggle }) => {
  const { user } = useAuth();
  const navItems = navByRole[user?.role] || [];

  return (
    <aside
      className={classNames(
        'flex flex-col h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={classNames('flex items-center h-16 px-4 border-b border-gray-200 dark:border-gray-700', collapsed ? 'justify-center' : '')}>
        {collapsed ? (
          <div className="overflow-hidden flex-shrink-0" style={{ width: 36, height: 20 }}>
            <img
              src="/kanan-logo.svg"
              alt="Kanan"
              style={{ height: 20, width: 153, maxWidth: 'none' }}
            />
          </div>
        ) : (
          <img src="/kanan-logo.svg" alt="Kanan" style={{ height: 20 }} />
        )}
      </div>

      {/* User info */}
      {!collapsed && user && (
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {ROLE_LABELS[user.role]}
          </p>
          <p className="mt-0.5 text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{user.name}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              classNames(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100',
                collapsed ? 'justify-center' : ''
              )
            }
            title={collapsed ? label : undefined}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="flex items-center justify-center h-10 mx-2 mb-3 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label="Toggle sidebar"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
};

export default Sidebar;
