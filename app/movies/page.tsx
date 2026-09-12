'use client';

import React, { useState, useEffect } from 'react';
import { UserLayout } from '@/components/user/UserLayout';
import { MovieGrid } from '@/components/user/MovieGrid';
import { useData } from '@/context/DataContext';
import { Film, SlidersHorizontal, Search, Sparkles } from 'lucide-react';

import { isGenreMatch } from '@/lib/initialData';

export default function MoviesPage() {
  const { movies, genres } = useData();
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'latest' | 'rating' | 'popular' | 'title'>('latest');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const publishedMovies = movies.filter((m) => m.isPublished);

  const filtered = publishedMovies
    .filter((m) => {
      const matchGenre = isGenreMatch(m.genres, selectedGenre);
      const matchSearch =
        !searchTerm.trim() ||
        m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.director.toLowerCase().includes(searchTerm.toLowerCase());
      return matchGenre && matchSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      if (sortBy === 'popular') return (b.views || 0) - (a.views || 0);
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      return (b.releaseYear || 2026) - (a.releaseYear || 2026);
    });

  return (
    <UserLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Header Banner */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-sm">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center space-x-3">
              <Film className="w-8 h-8 text-brand-red" />
              <span>បណ្ណាល័យភាពយន្តទាំងអស់</span>
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-1">
              ទស្សនាភាពយន្តល្បីៗ គុណភាពខ្ពស់ HD/4K គ្រប់ជម្រើសទាំងអស់។
            </p>
          </div>

          {/* Search & Sort Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="ស្វែងរកចំណងជើង..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-56 bg-slate-50 text-slate-900 text-xs font-bold py-2.5 pl-9 pr-4 rounded-2xl border border-slate-200 focus:outline-none focus:border-brand-red focus:bg-white"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-2xl">
              <SlidersHorizontal className="w-4 h-4 text-slate-500" />
              <span className="text-xs text-slate-500 font-bold whitespace-nowrap">តម្រៀប:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-slate-900 text-xs font-bold focus:outline-none cursor-pointer"
              >
                <option value="latest">ឆ្នាំចេញផ្សាយថ្មីៗ</option>
                <option value="rating">ពិន្ទុខ្ពស់បំផុត</option>
                <option value="popular">មើលច្រើនបំផុត</option>
                <option value="title">តាមអក្សរ A-Z</option>
              </select>
            </div>
          </div>
        </div>

        {/* Genre Filter Tabs */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedGenre('all')}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              selectedGenre === 'all'
                ? 'bg-brand-red text-white shadow-md shadow-brand-red/20'
                : 'bg-white text-slate-700 hover:text-slate-900 border border-slate-200 shadow-sm'
            }`}
          >
            <span>ភាពយន្តទាំងអស់ ({mounted ? publishedMovies.length : 0})</span>
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

        {/* Results Counter */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-xs font-semibold text-slate-500">
          <span suppressHydrationWarning className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            រកឃើញ {filtered.length} ភាពយន្ត
          </span>
        </div>

        {/* Movie Grid */}
        <MovieGrid movies={filtered} />
      </div>
    </UserLayout>
  );
}
