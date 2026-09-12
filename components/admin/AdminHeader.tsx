'use client';

import React from 'react';
import { Search, ShieldCheck, Menu } from 'lucide-react';
import { NotificationBell } from '@/components/user/NotificationBell';

interface AdminHeaderProps {
  onToggleMobileSidebar?: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ onToggleMobileSidebar }) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between z-30 sticky top-0 shadow-xs">
      <div className="flex items-center space-x-3">
        {/* Mobile Hamburger Toggle Button */}
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-2 text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition"
            title="បើក Menu Admin"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Quick Search Input */}
        <div className="relative w-44 sm:w-64 md:w-72">
          <input
            type="text"
            placeholder="ស្វែងរកក្នុង Admin..."
            className="w-full bg-slate-100 text-xs text-slate-900 placeholder-slate-400 rounded-full py-2 pl-8 sm:pl-9 pr-3 border border-slate-200 focus:outline-none focus:border-brand-red focus:bg-white"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Admin Status & Notification Bell */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        <div className="hidden sm:flex items-center space-x-1.5 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold text-emerald-700">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>ប្រព័ន្ធសុវត្ថិភាពសកម្ម</span>
        </div>

        <NotificationBell />
      </div>
    </header>
  );
};
