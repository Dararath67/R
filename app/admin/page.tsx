'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DashboardCharts } from '@/components/admin/DashboardCharts';
import { useData } from '@/context/DataContext';
import { api } from '@/lib/api';
import {
  Film,
  Tags,
  Users,
  Eye,
  Plus,
  ArrowUpRight,
  Star,
  AlertTriangle,
  FileQuestion,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { getDashboardStats, toggleBanUser, genres } = useData();
  const stats = getDashboardStats();
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    api.getAdminAnalytics().then((res) => {
      if (res) setAnalytics(res);
    });
  }, []);

  const kpiCards = [
    {
      title: 'សរុបភាពយន្ត',
      value: stats.totalMovies,
      icon: Film,
      color: 'from-blue-500 to-indigo-600',
      textColor: 'text-blue-600',
      link: '/admin/movies',
    },
    {
      title: 'ប្រភេទភាពយន្ត',
      value: genres.length || stats.categoryStats.length,
      icon: Tags,
      color: 'from-purple-500 to-pink-600',
      textColor: 'text-purple-600',
      link: '/admin/genres',
    },
    {
      title: 'អ្នកប្រើប្រាស់សរុប',
      value: stats.totalUsers,
      icon: Users,
      color: 'from-emerald-500 to-teal-600',
      textColor: 'text-emerald-600',
      link: '/admin/users',
    },
    {
      title: 'ចំនួនទស្សនាសរុប',
      value: stats.totalViews.toLocaleString(),
      icon: Eye,
      color: 'from-brand-crimson to-brand-red',
      textColor: 'text-brand-red',
      link: '/admin/movies',
    },
    {
      title: 'រាយការណ៍រឿងខូច',
      value: analytics ? analytics.pendingReports : 0,
      icon: AlertTriangle,
      color: 'from-amber-500 to-orange-600',
      textColor: 'text-amber-600',
      link: '/admin/reports',
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header Title & Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              ផ្ទាំងគ្រប់គ្រងទូទៅ (Admin Overview)
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              ស្ថិតិកើនឡើងជាក់ស្តែង ការទស្សនា និងជម្រើសគ្រប់គ្រងប្រព័ន្ធ។
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/admin/movies/add"
              className="px-5 py-2.5 bg-brand-red hover:bg-brand-crimson text-white font-bold rounded-2xl text-xs flex items-center space-x-2 shadow-md shadow-brand-red/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>បញ្ចូលភាពយន្តថ្មី</span>
            </Link>
          </div>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {kpiCards.map((card) => (
            <Link
              key={card.title}
              href={card.link}
              className="bg-white border border-slate-200 rounded-3xl p-5 hover:border-slate-300 shadow-sm transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {card.title}
                </span>
                <div
                  className={`p-2.5 rounded-xl bg-gradient-to-tr ${card.color} text-white shadow-md group-hover:scale-110 transition-transform`}
                >
                  <card.icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900">{card.value}</span>
                <ArrowUpRight className={`w-4 h-4 ${card.textColor}`} />
              </div>
            </Link>
          ))}
        </div>

        {/* Interactive Charts & Leaderboard */}
        <DashboardCharts
          monthlyViews={stats.monthlyViews}
          dailyViews={stats.dailyViews}
          topMovies={stats.topMovies}
          categoryStats={stats.categoryStats}
        />

        {/* Recent Activity Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Content */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                <Film className="w-4 h-4 text-brand-red" />
                <span>ភាពយន្ត និងរឿងភាគដែលទើបបញ្ចូលថ្មីៗ</span>
              </h3>
              <Link href="/admin/movies" className="text-xs text-brand-red font-bold hover:underline">
                មើលទាំងអស់
              </Link>
            </div>

            <div className="space-y-3">
              {stats.recentMovies.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <img
                      src={m.posterUrl}
                      alt={m.title}
                      className="w-10 h-14 rounded-lg object-cover flex-shrink-0 shadow-sm"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{m.title}</p>
                      <p className="text-[10px] text-slate-500 font-medium capitalize">
                        {m.type === 'series' ? 'រឿងភាគ' : 'ភាពយន្ត'} • {m.releaseYear} • {m.duration}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <span className="text-xs font-bold text-amber-700 flex items-center space-x-1 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                      <span>{m.rating}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Users Table */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>អ្នកប្រើប្រាស់ដែលទើបចុះឈ្មោះថ្មីៗ</span>
              </h3>
              <Link href="/admin/users" className="text-xs text-emerald-700 font-bold hover:underline">
                គ្រប់គ្រងអ្នកប្រើប្រាស់
              </Link>
            </div>

            <div className="space-y-3">
              {stats.recentUsers.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <img
                      src={u.avatar}
                      alt={u.name}
                      className="w-9 h-9 rounded-full object-cover flex-shrink-0 ring-2 ring-slate-200"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{u.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{u.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <button
                      onClick={() => toggleBanUser(u.id)}
                      className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border transition-colors ${
                        u.status === 'banned'
                          ? 'bg-amber-400 text-amber-950 border-amber-500 shadow-sm'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {u.status === 'banned' ? 'ផ្អាកគណនី' : 'សកម្ម'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
