'use client';

import React, { useState } from 'react';
import { TrendingUp, PieChart as PieIcon, BarChart3, Trophy, Calendar, Eye, Star } from 'lucide-react';

interface DashboardChartsProps {
  monthlyViews: { month: string; views: number }[];
  dailyViews?: { date: string; views: number }[];
  topMovies?: { title: string; views: number; rating: number }[];
  categoryStats: { genre: string; count: number }[];
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  monthlyViews = [],
  dailyViews = [],
  topMovies = [],
  categoryStats = [],
}) => {
  const [viewTab, setViewTab] = useState<'monthly' | 'daily'>('daily');

  const activeChartData = viewTab === 'daily' && dailyViews.length > 0 ? dailyViews : monthlyViews;
  const maxViews = Math.max(...activeChartData.map((m) => m.views || 0), 1);
  const maxCategory = Math.max(...categoryStats.map((c) => c.count || 0), 1);

  return (
    <div className="space-y-6">
      {/* Top row: Interactive Views Trend Chart + Top 5 Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Views Trend Chart (Spans 2 cols) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-brand-red" />
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                ស្ថិតិនៃការទស្សនា (Analytics Trend)
              </h3>
            </div>

            {/* Daily vs Monthly Tab Selector */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setViewTab('daily')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                  viewTab === 'daily'
                    ? 'bg-white text-brand-red shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>៧ថ្ងៃចុងក្រោយ</span>
              </button>
              <button
                onClick={() => setViewTab('monthly')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                  viewTab === 'monthly'
                    ? 'bg-white text-brand-red shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>ប្រចាំខែ</span>
              </button>
            </div>
          </div>

          {/* Bar Chart Visualization */}
          <div className="h-52 flex items-end justify-between gap-2.5 pt-6 pb-2">
            {activeChartData.map((item: any) => {
              const label = item.date || item.month || '';
              const val = item.views || 0;
              const heightPercent = Math.round((val / maxViews) * 100);

              return (
                <div key={label} className="flex-1 flex flex-col items-center gap-2 group relative">
                  <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow z-10 whitespace-nowrap">
                    {val.toLocaleString()} views
                  </div>
                  <div className="w-full bg-slate-100 rounded-t-xl overflow-hidden h-40 flex items-end">
                    <div
                      className="w-full bg-gradient-to-t from-brand-crimson to-brand-red rounded-t-xl transition-all duration-500 group-hover:brightness-110"
                      style={{ height: `${Math.max(heightPercent, 8)}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-slate-600 truncate max-w-full">
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top 5 Most Watched Leaderboard */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                Top 5 ភាពយន្តមើលច្រើនជាងគេ
              </h3>
            </div>
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              Leaderboard
            </span>
          </div>

          <div className="space-y-3">
            {topMovies.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">មិនទាន់មានទិន្នន័យ</p>
            ) : (
              topMovies.slice(0, 5).map((m, idx) => {
                const rankColors = [
                  'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black',
                  'bg-gradient-to-r from-slate-300 to-slate-400 text-slate-900 font-bold',
                  'bg-gradient-to-r from-amber-700 to-amber-800 text-white font-bold',
                  'bg-slate-100 text-slate-700 font-semibold',
                  'bg-slate-100 text-slate-700 font-semibold',
                ];

                return (
                  <div
                    key={m.title}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100/80 transition-colors"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <span
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs shadow-sm flex-shrink-0 ${
                          rankColors[idx] || 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{m.title}</p>
                        <div className="flex items-center space-x-2 text-[10px] text-slate-500 mt-0.5">
                          <span className="flex items-center gap-0.5 text-amber-600 font-semibold">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {m.rating}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 text-xs font-black text-brand-red bg-red-50 px-2.5 py-1 rounded-xl border border-red-100">
                      <Eye className="w-3.5 h-3.5 text-brand-red" />
                      <span>{m.views.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Category Distribution Chart */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
          <PieIcon className="w-5 h-5 text-amber-600" />
          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
            ស្ថិតិភាពយន្តតាមប្រភេទ (Category Distribution)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {categoryStats.slice(0, 6).map((cat) => {
            const percent = Math.round((cat.count / maxCategory) * 100);
            return (
              <div key={cat.genre} className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-800">{cat.genre}</span>
                  <span className="text-slate-500">{cat.count} ចំណងជើង</span>
                </div>
                <div className="w-full h-2.5 bg-slate-200/60 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-500 to-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(percent, 5)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
