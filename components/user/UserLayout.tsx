'use client';

import React from 'react';
import { UserNavbar } from './UserNavbar';
import { UserFooter } from './UserFooter';
import { MobileBottomNav } from './MobileBottomNav';

export const UserLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-brand-red selection:text-white font-sans pb-16 md:pb-0">
      <UserNavbar />

      <main className="flex-grow pt-16">{children}</main>
      <UserFooter />

      <MobileBottomNav />
    </div>
  );
};
