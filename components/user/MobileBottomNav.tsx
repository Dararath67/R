'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Film, MessageSquare, User, Heart } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export const MobileBottomNav: React.FC = () => {
  const pathname = usePathname();
  const { currentUser } = useAuth();

  // Hide bottom nav on admin routes
  if (pathname.startsWith('/admin')) return null;

  const navItems = [
    { name: 'ទំព័រដើម', path: '/', icon: Home },
    { name: 'ស្វែងរក', path: '/search', icon: Search },
    { name: 'ភាពយន្ត', path: '/movies', icon: Film },
    { name: 'ឆាត', path: '/chat', icon: MessageSquare },
    { name: 'គណនី', path: currentUser ? '/profile' : '/login', icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-slate-950/95 border-t border-slate-800/90 backdrop-blur-2xl px-3 py-2 shadow-2xl">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
          
          return (
            <Link
              key={item.path}
              href={item.path}
              prefetch={true}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 ${
                isActive
                  ? 'text-brand-red font-black scale-105'
                  : 'text-slate-400 hover:text-slate-200 active:scale-95'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-colors ${isActive ? 'bg-brand-red/15 border border-brand-red/30' : ''}`}>
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5 font-bold">
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
