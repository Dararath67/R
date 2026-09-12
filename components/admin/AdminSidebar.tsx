'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Film,
  Users,
  Tags,
  Settings,
  LogOut,
  ShieldAlert,
  ArrowLeft,
  Headphones,
  AlertTriangle,
  FileQuestion,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { TerkTlaLogo } from '@/components/user/TerkTlaLogo';

interface AdminSidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ mobileOpen, onMobileClose }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, currentUser } = useAuth();

  const menuItems = [
    { name: 'ផ្ទាំងព័ត៌មានទូទៅ', path: '/admin', icon: LayoutDashboard },
    { name: 'គ្រប់គ្រងភាពយន្ត', path: '/admin/movies', icon: Film },
    { name: 'រាយការណ៍វីដេអូខូច', path: '/admin/reports', icon: AlertTriangle },
    { name: 'គ្រប់គ្រងអ្នកប្រើប្រាស់', path: '/admin/users', icon: Users },
    { name: 'ឆាតគាំទ្រ (Support Chat)', path: '/admin/support', icon: Headphones },
    { name: 'ប្រភេទភាពយន្ត', path: '/admin/genres', icon: Tags },
    { name: 'កំណត់ហេតុសុវត្ថិភាព', path: '/admin/security', icon: ShieldAlert },
    { name: 'ការកំណត់ប្រព័ន្ធ', path: '/admin/settings', icon: Settings },
  ];

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full">
      {/* Top Brand Banner */}
      <div>
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="space-y-1">
            <Link href="/" className="inline-block">
              <TerkTlaLogo variant="light" size="sm" />
            </Link>
            <div>
              <span className="text-[9px] text-amber-700 font-black tracking-widest uppercase bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                ADMIN CONTROL PANEL
              </span>
            </div>
          </div>
          {onMobileClose && (
            <button
              onClick={onMobileClose}
              className="md:hidden p-2 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-xl"
              title="បិទ Menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation List */}
        <nav className="p-4 space-y-1.5 overflow-y-auto max-h-[calc(100vh-200px)] scrollbar-none">
          {menuItems.map((item) => {
            const isActive =
              item.path === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={onMobileClose}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all duration-75 active:duration-0 ease-out transform active:scale-95 whitespace-nowrap flex-shrink-0 ${
                  isActive
                    ? 'bg-brand-red text-white shadow-md shadow-brand-red/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="whitespace-nowrap">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile & Exit Controls */}
      <div className="p-4 border-t border-slate-100 space-y-3 bg-white">
        {currentUser && (
          <div className="flex items-center space-x-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-brand-red/40"
            />
            <div className="flex-grow min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{currentUser.email}</p>
            </div>
          </div>
        )}

        <div className="space-y-1">
          <Link
            href="/"
            className="w-full flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>ត្រឡប់ទៅគេហទំព័រដើម</span>
          </Link>

          <button
            onClick={() => {
              if (onMobileClose) onMobileClose();
              logout();
              router.push('/admin/login');
            }}
            className="w-full flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>ចាកចេញពីប្រព័ន្ធ</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 min-h-screen flex-col justify-between flex-shrink-0 shadow-sm">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-[9999] flex">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs animate-fade-in"
            onClick={onMobileClose}
          />
          <div className="relative w-72 max-w-[80vw] bg-white h-full shadow-2xl z-10 animate-slide-right flex flex-col justify-between">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
