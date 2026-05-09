import React from 'react';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Users, LayoutDashboard, Flag, AlertTriangle, FileText, ArrowLeft, Loader2, Calendar } from 'lucide-react';
import { Button } from '../components/ui/Button';

export default function AdminLayout() {
  const { userData, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
         <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  if (!userData || userData.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center p-4">
        <Shield className="w-24 h-24 text-red-500 mb-6" />
        <h1 className="text-3xl font-bold mb-2">Access Denied</h1>
        <p className="text-[var(--text-secondary)] mb-8 max-w-md text-center">
          You do not have administrative privileges to view this page. If you believe this is an error, please contact support.
        </p>
        <Link to="/dashboard">
          <Button variant="primary">Return to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const navItems = [
    { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { label: 'Users', path: '/admin/users', icon: Users },
    { label: 'Events', path: '/admin/events', icon: Calendar },
    { label: 'Content Moderation', path: '/admin/content', icon: FileText },
    { label: 'Reports', path: '/admin/reports', icon: Flag },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex text-[var(--text-primary)] font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[var(--bg-secondary)] border-r border-[var(--card-border)] flex flex-col">
        <div className="p-6">
          <Link to="/dashboard" className="flex items-center gap-2 mb-8 group">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight block leading-none">Admin Panel</span>
              <span className="text-xs text-[var(--text-secondary)]">Campus Connect AI</span>
            </div>
          </Link>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium border border-transparent ${
                    isActive
                      ? 'bg-[var(--accent)]/10 text-yellow-500 border-yellow-500/20'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-yellow-500' : ''}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="mt-auto p-6">
           <Link to="/dashboard">
             <Button variant="outline" className="w-full justify-start text-[var(--text-secondary)]">
               <ArrowLeft className="w-4 h-4 mr-2" /> Exit Admin
             </Button>
           </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
