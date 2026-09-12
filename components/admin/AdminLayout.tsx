'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { Lock } from 'lucide-react';

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isAdmin, isAuthenticated, isLoaded } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    if (isLoaded && !isLoginPage && (!isAuthenticated || !isAdmin)) {
      router.push('/admin/login');
    }
  }, [isLoaded, isAuthenticated, isAdmin, isLoginPage, router]);

  if (isLoginPage) {
    return <div className="min-h-screen bg-slate-50 text-slate-900">{children}</div>;
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-red border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-4 space-y-4">
        <div className="p-4 bg-red-50 text-red-600 rounded-full border border-red-200">
          <Lock className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Access Denied - Security Guard</h2>
        <p className="text-sm text-slate-500 text-center max-w-md">
          Redirecting to admin login...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex font-sans selection:bg-brand-red selection:text-white max-w-full overflow-x-hidden">
      {/* Admin Sidebar */}
      <AdminSidebar
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Body */}
      <div className="flex-grow flex flex-col min-w-0 max-w-full overflow-x-hidden">
        <AdminHeader onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)} />
        <main className="p-3 sm:p-6 lg:p-8 flex-grow overflow-y-auto overflow-x-hidden min-w-0 max-w-full">{children}</main>
      </div>
    </div>
  );
};
