'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';
import { Ban, MessageSquare, AlertTriangle, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export const BannedUserGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isLoaded } = useAuth();
  const pathname = usePathname();

  const isBanned = isLoaded && currentUser?.status === 'banned';
  const isChatPage = pathname === '/chat';
  const isAuthPage = pathname === '/login' || pathname === '/register';

  if (isBanned && !isChatPage && !isAuthPage) {
    return (
      <div className="relative min-h-screen bg-slate-950">
        {/* Render children in background with heavy blur and pointer-events disabled */}
        <div className="pointer-events-none select-none blur-md opacity-30 grayscale" aria-hidden="true">
          {children}
        </div>

        {/* Full-screen Blocking Overlay for Banned User */}
        <div className="fixed inset-0 z-[99999] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border-2 border-amber-500/80 rounded-3xl p-6 sm:p-8 text-center shadow-2xl shadow-amber-500/10 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Header Badge */}
            <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-400/10 border border-amber-500/30 flex items-center justify-center text-amber-400 animate-pulse">
              <Ban className="w-9 h-9 sm:w-11 sm:h-11" />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-400 text-amber-950 border border-amber-500 uppercase tracking-wide">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>ស្ថានភាពគណនី៖ ផ្អាកគណនី</span>
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                គណនីរបស់អ្នកត្រូវបានផ្អាក! (Account Suspended)
              </h2>
            </div>

            <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-4 text-xs sm:text-sm text-amber-200/90 leading-relaxed font-medium text-left space-y-2">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-300">ដំណឹងសំខាន់សម្រាប់អ្នកប្រើប្រាស់:</p>
                  <p className="mt-1">
                    គណនីរបស់អ្នកត្រូវបានផ្អាកជាបណ្តោះអាសន្នដោយ អ្នកគ្រប់គ្រងប្រព័ន្ធ (Admin)។ 
                    ក្នុងស្ថានភាពនេះ អ្នកអាចធ្វើបានតែមួយគត់គឺចូលទៅកាន់ <strong>ឆាតជំនួយ Support</strong> 
                    ដើម្បីផ្ញើសារសាកសួរ និងស្នើសុំបើកគណនីឡើងវិញ។
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/chat"
                className="w-full py-3.5 px-6 rounded-2xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-sm flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20 transition-all transform hover:scale-[1.02]"
              >
                <MessageSquare className="w-5 h-5 fill-amber-950 text-amber-950" />
                <span>ចូលទៅកាន់ឆាតជំនួយ (Support Chat)</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
