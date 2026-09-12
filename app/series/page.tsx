'use client';

import React, { useState } from 'react';
import { UserLayout } from '@/components/user/UserLayout';
import { MovieGrid } from '@/components/user/MovieGrid';
import { useData } from '@/context/DataContext';
import { Tv, SlidersHorizontal } from 'lucide-react';

import { isGenreMatch } from '@/lib/initialData';

export default function SeriesPage() {
  const { series, genres } = useData();
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'latest' | 'rating' | 'popular'>('latest');

  const publishedSeries = series.filter((s) => s.isPublished);

  const filtered = publishedSeries
    .filter((s) => isGenreMatch(s.genres, selectedGenre))
    .sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'popular') return b.views - a.views;
      return b.releaseYear - a.releaseYear;
    });

  return (
    <UserLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Header Banner */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center space-x-3">
              <Tv className="w-8 h-8 text-brand-accent" />
              <span>បណ្ណាល័យរឿងភាគទាំងអស់</span>
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-1">
              តាមដានទស្សនារឿងភាគល្បីៗជាច្រើនភាគ គុណភាពខ្ពស់ HD/4K។
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <SlidersHorizontal className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-500 uppercase font-bold">តម្រៀបតាម:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-50 text-slate-900 text-xs font-bold px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-brand-red"
            >
              <option value="latest">ថ្មីៗបំផុត</option>
              <option value="rating">ពិន្ទុខ្ពស់បំផុត</option>
              <option value="popular">ពេញនិយមបំផុត</option>
            </select>
          </div>
        </div>

        {/* Genre Tabs */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedGenre('all')}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              selectedGenre === 'all'
                ? 'bg-brand-red text-white shadow-md shadow-brand-red/20'
                : 'bg-white text-slate-700 hover:text-slate-900 border border-slate-200 shadow-sm'
            }`}
          >
            រឿងភាគទាំងអស់ ({publishedSeries.length})
          </button>
          {genres.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedGenre(g.name)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                selectedGenre === g.name
                  ? 'bg-brand-red text-white shadow-md shadow-brand-red/20'
                  : 'bg-white text-slate-700 hover:text-slate-900 border border-slate-200 shadow-sm'
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>

        {/* Series Grid */}
        <MovieGrid movies={filtered} />
      </div>
    </UserLayout>
  );
}
