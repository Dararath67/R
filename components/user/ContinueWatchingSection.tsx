'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Clock, X, RotateCcw } from 'lucide-react';
import { useData } from '@/context/DataContext';

export interface ProgressItem {
  contentId: string;
  episodeId?: string;
  title: string;
  posterUrl: string;
  currentTime: number;
  duration: number;
  updatedAt: string;
}

export const PROGRESS_CACHE_KEY = 'movie_app_playback_progress';

export const saveProgressItem = (item: ProgressItem) => {
  try {
    const raw = localStorage.getItem(PROGRESS_CACHE_KEY);
    const map: Record<string, ProgressItem> = raw ? JSON.parse(raw) : {};
    map[item.contentId] = item;
    localStorage.setItem(PROGRESS_CACHE_KEY, JSON.stringify(map));
  } catch (err) {
    console.error('Error saving playback progress', err);
  }
};

export const getProgressMap = (): Record<string, ProgressItem> => {
  try {
    const raw = localStorage.getItem(PROGRESS_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const ContinueWatchingSection: React.FC = () => {
  const { movies, series } = useData();
  const [items, setItems] = useState<ProgressItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadItems();
  }, [movies, series]);

  const loadItems = () => {
    const map = getProgressMap();
    const list = Object.values(map)
      .filter((p) => p.currentTime > 5 && p.duration > 0 && p.currentTime < p.duration - 15)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 4);
    setItems(list);
  };

  const handleRemoveProgress = (e: React.MouseEvent, contentId: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const map = getProgressMap();
      delete map[contentId];
      localStorage.setItem(PROGRESS_CACHE_KEY, JSON.stringify(map));
      setItems((prev) => prev.filter((i) => i.contentId !== contentId));
    } catch (err) {
      console.error('Failed to remove item', err);
    }
  };

  if (!mounted || items.length === 0) return null;

  return (
    <div className="space-y-4 mb-10 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-brand-red">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              បន្តការទស្សនា (Continue Watching)
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              ទស្សនាបន្តពីនាទីដែលអ្នកបានផ្អាកពីមុន
            </p>
          </div>
        </div>
      </div>

      {/* Progress Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((item) => {
          const percent = Math.min(100, Math.round((item.currentTime / (item.duration || 1)) * 100));
          const targetHref = item.episodeId
            ? `/watch/${item.contentId}?ep=${item.episodeId}`
            : `/watch/${item.contentId}`;

          return (
            <Link
              key={item.contentId}
              href={targetHref}
              className="group relative bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:border-brand-red/40 transition-all duration-200 flex flex-col justify-between"
            >
              {/* Poster Thumbnail Header */}
              <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
                <img
                  src={item.posterUrl}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-brand-red text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="w-5 h-5 fill-white ml-0.5" />
                  </div>
                </div>

                {/* Clear Progress Cross Button */}
                <button
                  onClick={(e) => handleRemoveProgress(e, item.contentId)}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-950/70 hover:bg-red-600 text-white transition-colors z-10"
                  title="លុបប្រវត្តិទស្សនានេះ"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Progress Detail Footer */}
              <div className="p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-900 truncate max-w-[180px]">
                    {item.title}
                  </h3>
                  <span className="text-[10px] font-extrabold text-brand-red bg-red-50 px-2 py-0.5 rounded-full">
                    {percent}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div
                    className="h-full bg-gradient-to-r from-brand-red to-amber-500 rounded-full transition-all duration-300"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
