'use client';

import React, { useState, useEffect } from 'react';
import { X, Radio } from 'lucide-react';
import { useData } from '@/context/DataContext';

export const HeaderAnnouncementBar: React.FC = () => {
  const { bannerSettings } = useData();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check sessionStorage to see if user already closed announcement in this session
    if (typeof window !== 'undefined') {
      const isDismissed = sessionStorage.getItem('header_announcement_dismissed') === 'true';
      setDismissed(isDismissed);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem('header_announcement_dismissed', 'true');
    } catch {
      // Fallback if sessionStorage disabled
    }
  };

  if (
    dismissed ||
    !bannerSettings ||
    bannerSettings.showAnnouncement === false ||
    (!bannerSettings.announcementText && !bannerSettings.announcementTitle)
  ) {
    return null;
  }

  const colorClass =
    bannerSettings.announcementColor === 'yellow'
      ? 'bg-amber-500 text-slate-950 border-amber-400'
      : bannerSettings.announcementColor === 'blue'
      ? 'bg-blue-950 text-white border-blue-800'
      : bannerSettings.announcementColor === 'dark'
      ? 'bg-slate-950 text-white border-slate-800'
      : 'bg-gradient-to-r from-red-800 via-brand-red to-red-900 text-white border-red-700';

  return (
    <div className={`w-full py-2 px-4 ${colorClass} text-xs font-bold transition-all duration-300 border-b z-50 flex items-center justify-between shadow-sm animate-fade-in`}>
      <div className="max-w-7xl mx-auto flex items-center justify-center space-x-2 text-center flex-grow px-2 sm:px-4">
        {bannerSettings.announcementTitle && (
          <span className="flex items-center space-x-1 bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] uppercase font-black tracking-wider flex-shrink-0">
            <Radio className="w-3 h-3 text-white animate-pulse" />
            <span>{bannerSettings.announcementTitle}</span>
          </span>
        )}
        {bannerSettings.announcementText && (
          <span className="font-medium truncate max-w-xs sm:max-w-md md:max-w-2xl text-white/95">
            {bannerSettings.announcementText}
          </span>
        )}
      </div>

      <button
        onClick={handleDismiss}
        className="p-1 hover:bg-black/20 rounded-lg transition-colors flex-shrink-0 cursor-pointer"
        title="បិទសារជូនដំណឹង (Close Announcement)"
      >
        <X className="w-4 h-4 text-white/90 hover:text-white" />
      </button>
    </div>
  );
};
