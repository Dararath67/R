'use client';

import React from 'react';

interface TerkTlaLogoProps {
  className?: string;
  variant?: 'dark' | 'light'; // 'dark' = for dark backgrounds (white TERK text), 'light' = for light backgrounds (slate-900 TERK text)
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const TerkTlaLogo: React.FC<TerkTlaLogoProps> = ({
  className = '',
  variant = 'light',
  size = 'md',
}) => {
  const isDark = variant === 'dark';
  const terkColor = isDark ? 'text-white' : 'text-slate-900';
  const chainLeftStroke = isDark ? '#FFFFFF' : '#1E293B';
  const chainRightStroke = isDark ? '#94A3B8' : '#475569';

  const textSizeClass = {
    sm: 'text-lg sm:text-xl',
    md: 'text-2xl sm:text-3xl',
    lg: 'text-3xl sm:text-4xl',
    xl: 'text-4xl sm:text-5xl',
  }[size];

  const badgePadding = {
    sm: 'px-2 py-0.5 rounded-lg text-xs sm:text-sm',
    md: 'px-2.5 py-0.5 sm:py-1 rounded-xl text-sm sm:text-lg',
    lg: 'px-3 py-1 rounded-2xl text-lg sm:text-xl',
    xl: 'px-4 py-1.5 rounded-2xl text-xl sm:text-2xl',
  }[size];

  const iconSize = {
    sm: 'w-5 h-5 -top-2 left-[56%]',
    md: 'w-7 h-7 -top-3.5 left-[56%]',
    lg: 'w-9 h-9 -top-4 left-[56%]',
    xl: 'w-11 h-11 -top-5 left-[56%]',
  }[size];

  return (
    <div className={`relative inline-flex items-center select-none group ${className}`}>
      {/* TERK Text */}
      <span className={`font-black tracking-tight uppercase ${textSizeClass} ${terkColor}`}>
        TERK
      </span>

      {/* Floating Chain Link Icon hovering on top center between TERK and TLA */}
      <div className={`absolute -translate-x-1/2 -rotate-45 pointer-events-none transition-transform duration-300 group-hover:scale-110 ${iconSize}`}>
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md">
          {/* Left Ring (White / Dark Slate) */}
          <rect
            x="4"
            y="11"
            width="16"
            height="10"
            rx="5"
            stroke={chainLeftStroke}
            strokeWidth="3.5"
            fill="none"
          />
          {/* Right Ring Interlocking (Gray / Slate) */}
          <rect
            x="12"
            y="11"
            width="16"
            height="10"
            rx="5"
            stroke={chainRightStroke}
            strokeWidth="3.5"
            fill="none"
          />
        </svg>
      </div>

      {/* TLA Amber Badge */}
      <div className={`ml-1 bg-[#ECA52B] hover:bg-[#f0ad35] transition-colors flex items-center justify-center shadow-md shadow-amber-500/20 ${badgePadding}`}>
        <span className="font-black tracking-tight text-slate-950 uppercase leading-none">
          TLA
        </span>
      </div>
    </div>
  );
};
