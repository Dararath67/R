'use client';

import React from 'react';
import Link from 'next/link';
import { UserLayout } from '@/components/user/UserLayout';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { History, Play, Clock } from 'lucide-react';

export default function HistoryPage() {
  const { movies, series } = useData();
  const { currentUser, isAuthenticated } = useAuth();

  const allContent = [...movies, ...series];

  const historyList = (currentUser?.history || []).map((h) => {
    const item = allContent.find((m) => m.id === h.contentId);
    return {
      ...h,
      item,
    };
  }).filter((h) => h.item !== undefined);

  return (
    <UserLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="flex items-center justify-between border-b border-slate-200 pb-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">ប្រវត្តិទស្សនា</h1>
              <p className="text-sm text-slate-500 font-medium">ទស្សនាបន្តពីកន្លែងដែលអ្នកបានផ្អាក</p>
            </div>
          </div>
        </div>

        {!isAuthenticated ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-4 shadow-sm">
            <p className="text-slate-600 font-medium">សូមចូលប្រើប្រាស់គណនី ដើម្បីរក្សាទុកប្រវត្តិការទស្សនារបស់អ្នក។</p>
            <Link href="/login" className="inline-block bg-brand-red text-white px-6 py-2.5 rounded-xl font-bold">
              ចូលប្រើប្រាស់
            </Link>
          </div>
        ) : historyList.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-2 shadow-sm">
            <p className="text-slate-600 font-bold">មិនទាន់មានប្រវត្តិទស្សនានៅឡើយទេ។</p>
            <p className="text-xs text-slate-400 font-medium">ចាប់ផ្តើមទស្សនាភាពយន្តឥឡូវនេះ!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {historyList.map((h) => {
              const movie = h.item!;
              return (
                <div
                  key={h.id}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden group flex flex-col justify-between shadow-sm hover:shadow-md transition-all"
                >
                  <div className="relative aspect-video bg-slate-900">
                    <img
                      src={movie.backdropUrl || movie.posterUrl}
                      alt={movie.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <Link
                      href={h.episodeId ? `/watch/${movie.id}?ep=${h.episodeId}` : `/watch/${movie.id}`}
                      className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <div className="w-12 h-12 rounded-full bg-brand-red text-white flex items-center justify-center shadow-lg">
                        <Play className="w-6 h-6 fill-white ml-0.5" />
                      </div>
                    </Link>
                    {/* Progress Bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-200">
                      <div
                        className="h-full bg-brand-red"
                        style={{ width: `${Math.min(h.progress, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-3.5 space-y-1">
                    <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{movie.title}</h3>
                    <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                      <span>ទស្សនាបាន {h.progress}%</span>
                      <span className="flex items-center text-[10px]">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(h.watchedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </UserLayout>
  );
}
