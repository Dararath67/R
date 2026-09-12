'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Film, Tv, Heart, History, User as UserIcon, LogOut, Menu, X, Play, UploadCloud, PlusCircle } from 'lucide-react';
import { NotificationBell } from '@/components/user/NotificationBell';
import { UserUploadModal } from '@/components/user/UserUploadModal';
import { RequestMovieModal } from '@/components/user/RequestMovieModal';
import { HeaderAnnouncementBar } from '@/components/user/HeaderAnnouncementBar';
import { TerkTlaLogo } from '@/components/user/TerkTlaLogo';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';

export const UserNavbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, isAuthenticated, logout, isLoaded: isAuthLoaded } = useAuth();
  const { bannerSettings } = useData();
  const [mounted, setMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const navLinks = [
    { name: 'ទំព័រដើម', path: '/' },
    { name: 'ភាពយន្ត', path: '/movies' },
    { name: 'ឆាតពិភាក្សា', path: '/chat' },
    { name: 'ចូលចិត្ត', path: '/favorites' },
    { name: 'ប្រវត្តិទស្សនា', path: '/history' },
  ];

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex flex-col">
      <HeaderAnnouncementBar />
      <nav
        className={`w-full transition-all duration-300 ${
          isScrolled
            ? 'bg-white/95 backdrop-blur-2xl border-b border-slate-200/90 py-3 shadow-md'
            : 'bg-white/90 backdrop-blur-xl border-b border-slate-100 py-3.5 shadow-xs'
        }`}
      >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* TERK TLA Brand Logo */}
          <Link href="/" className="flex items-center group flex-shrink-0">
            <TerkTlaLogo variant="light" size="md" />
          </Link>

          {/* Centered Floating Pill Navigation Container with Instant Responsive Styling */}
          <div className="hidden md:flex items-center space-x-1 bg-slate-100/95 backdrop-blur-2xl px-2 py-1.5 rounded-full border border-slate-200/90 shadow-xs">
            {navLinks.map((link) => {
              const isActive = pathname === link.path;
              return (
                <Link
                  key={link.path}
                  href={link.path}
                  prefetch={true}
                  className={`px-4 py-2 rounded-full text-xs font-extrabold whitespace-nowrap transition-all duration-75 active:duration-0 ease-out transform active:scale-95 hover:scale-[1.02] ${
                    isActive
                      ? 'bg-brand-red text-white shadow-md shadow-brand-red/30 ring-2 ring-brand-red/30 scale-[1.02]'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/80'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>

          {/* Right Action Section: Search Button & Profile Button */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Search Input Bar */}
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              {showSearchInput ? (
                <div className="relative animate-fade-in">
                  <input
                    type="text"
                    placeholder="ស្វែងរកភាពយន្ត..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    onBlur={() => !searchQuery && setShowSearchInput(false)}
                    className="w-48 bg-slate-100 text-xs text-slate-900 placeholder-slate-400 rounded-full py-2 pl-9 pr-4 border border-slate-300 focus:outline-none focus:border-brand-red transition-all font-medium"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSearchInput(true)}
                  className="p-2.5 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-full transition-all border border-slate-200 shadow-xs"
                  title="ស្វែងរក"
                >
                  <Search className="w-4 h-4 text-slate-600" />
                </button>
              )}
            </form>

            {/* Global System Notification Bell */}
            <NotificationBell />

            {/* Upload Video Button */}
            {isAuthenticated && currentUser && (
              <div className="hidden sm:flex items-center space-x-2">
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-full border border-slate-200 text-xs font-bold transition-all hover:scale-105"
                  title="អាប់ឡូតវីដេអូ (Upload Video)"
                >
                  <UploadCloud className="w-4 h-4 text-brand-red" />
                  <span>អាប់ឡូត</span>
                </button>
              </div>
            )}

            {/* User Profile or Red Sign In Pill Button with Loading State to prevent Flash */}
            {!mounted || !isAuthLoaded ? (
              <div className="w-28 h-9 bg-slate-100/80 rounded-full border border-slate-200 animate-pulse" />
            ) : isAuthenticated && currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center space-x-3 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 p-1.5 pr-3 rounded-full transition-all shadow-xs"
                >
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-brand-red/60"
                  />
                  <span className="text-xs font-bold text-slate-800 max-w-[100px] truncate">
                    {currentUser.name}
                  </span>
                  {currentUser.isVip && (
                    <span className="bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded-full shadow-sm uppercase tracking-wider">
                      VIP
                    </span>
                  )}
                </button>

                {/* Profile Dropdown */}
                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-fade-in text-slate-800">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs text-slate-400">ចូលប្រើប្រាស់ជា</p>
                      <p className="text-xs font-bold text-slate-800 truncate">{currentUser.email}</p>
                    </div>
                    <Link
                      href="/profile"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center space-x-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-brand-red transition-colors"
                    >
                      <UserIcon className="w-4 h-4 text-slate-400" />
                      <span>គណនីរបស់ខ្ញុំ</span>
                    </Link>
                    <Link
                      href="/favorites"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center space-x-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-brand-red transition-colors"
                    >
                      <Heart className="w-4 h-4 text-slate-400" />
                      <span>បញ្ជីចូលចិត្ត</span>
                    </Link>
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center space-x-2 px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors border-t border-slate-100 mt-1"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>ចាកចេញ</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="px-6 py-2 rounded-full text-xs font-black text-white bg-brand-red hover:bg-brand-crimson shadow-md shadow-brand-red/30 transition-all"
              >
                Sign In / ចូលប្រើ
              </Link>
            )}
          </div>

          {/* Mobile Menu Button & Quick Actions */}
          <div className="flex items-center space-x-2 md:hidden">
            <NotificationBell />

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-700 bg-slate-100 border border-slate-200 active:scale-95 transition"
              title="Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-6 space-y-4 animate-fade-in text-slate-900 shadow-xl">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              placeholder="ស្វែងរកភាពយន្ត..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 text-xs text-slate-900 placeholder-slate-400 rounded-full py-2.5 pl-10 pr-4 border border-slate-200"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          </form>

          <div className="space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap ${
                  pathname === link.path
                    ? 'text-white bg-brand-red shadow-md shadow-brand-red/30'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>{link.name}</span>
              </Link>
            ))}
          </div>

          {/* Quick Action Buttons in Mobile Drawer */}
          {isAuthenticated && currentUser ? (
            <div className="pt-3 border-t border-slate-100 space-y-2.5">
              <div className="flex items-center space-x-3 px-3 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                <img src={currentUser.avatar} alt={currentUser.name} className="w-8 h-8 rounded-full object-cover ring-2 ring-brand-red" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{currentUser.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{currentUser.email}</p>
                </div>
                {currentUser.isVip && (
                  <span className="bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded-full">VIP</span>
                )}
              </div>
              <div>
                <button
                  onClick={() => { setMobileMenuOpen(false); setIsUploadModalOpen(true); }}
                  className="w-full flex items-center justify-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl border border-slate-200 text-xs font-bold"
                >
                  <UploadCloud className="w-4 h-4 text-brand-red" />
                  <span>អាប់ឡូតវីដេអូ</span>
                </button>
              </div>
              <button
                onClick={() => { setMobileMenuOpen(false); logout(); }}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>ចាកចេញ (Sign Out)</span>
              </button>
            </div>
          ) : (
            <div className="pt-3 border-t border-slate-100">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-black text-white bg-brand-red hover:bg-brand-crimson shadow-md shadow-brand-red/30"
              >
                Sign In / ចូលប្រើ
              </Link>
            </div>
          )}
        </div>
      )}

      {/* User Upload Video Modal */}
      <UserUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />

      {/* User Request Movie Modal */}
      <RequestMovieModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
      />
    </nav>
    </div>
  );
};
