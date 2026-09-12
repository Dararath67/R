'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { UserLayout } from '@/components/user/UserLayout';
import { MovieGrid } from '@/components/user/MovieGrid';
import { useData } from '@/context/DataContext';
import { Search } from 'lucide-react';

import { isGenreMatch } from '@/lib/initialData';

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const { movies, series, genres } = useData();
  const [query, setQuery] = useState(initialQuery);
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'movie' | 'series'>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'rating' | 'title'>('latest');

  useEffect(() => {
    setQuery(searchParams.get('q') || '');
  }, [searchParams]);

  const allContent = [...movies, ...series].filter((m) => m.isPublished);

  let results = allContent.filter((m) => {
    const matchesQuery =
      query.trim() === '' ||
      m.title.toLowerCase().includes(query.toLowerCase()) ||
      m.description.toLowerCase().includes(query.toLowerCase()) ||
      m.cast.some((c) => c.toLowerCase().includes(query.toLowerCase()));

    const matchesGenre = isGenreMatch(m.genres, selectedGenre);
    const matchesType = selectedType === 'all' || m.type === selectedType;
    const matchesYear = selectedYear === 'all' || m.releaseYear?.toString() === selectedYear;

    return matchesQuery && matchesGenre && matchesType && matchesYear;
  });

  // Sorting
  results = results.sort((a, b) => {
    if (sortBy === 'popular') return (b.views || 0) - (a.views || 0);
    if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  const yearOptions = ['2024', '2023', '2022', '2021', '2020'];

  return (
    <UserLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 font-khmer">
        {/* Search Header Form */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-5 shadow-sm">
          <div className="relative max-w-2xl mx-auto">
            <input
              type="text"
              placeholder="ស្វែងរកចំណងជើងរឿង ឈ្មោះតួអង្គ ឬអ្នកដឹកនាំ..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-slate-50 text-sm text-slate-900 placeholder-slate-400 rounded-full py-3.5 pl-12 pr-4 border border-slate-200 focus:outline-none focus:border-brand-red focus:bg-white font-medium"
            />
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-4" />
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-bold pt-2 border-t border-slate-100">
            {/* Type Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-slate-500">ប្រភេទមាតិកា:</span>
              <button
                onClick={() => setSelectedType('all')}
                className={`px-3 py-1.5 rounded-xl border transition ${
                  selectedType === 'all'
                    ? 'bg-brand-red text-white border-brand-red'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                ទាំងអស់
              </button>
              <button
                onClick={() => setSelectedType('movie')}
                className={`px-3 py-1.5 rounded-xl border transition ${
                  selectedType === 'movie'
                    ? 'bg-brand-red text-white border-brand-red'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                រឿងដុំ (Movies)
              </button>
              <button
                onClick={() => setSelectedType('series')}
                className={`px-3 py-1.5 rounded-xl border transition ${
                  selectedType === 'series'
                    ? 'bg-brand-red text-white border-brand-red'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                រឿងភាគ (Series)
              </button>
            </div>

            {/* Genre Dropdown */}
            <div className="flex items-center space-x-2">
              <span className="text-slate-500">ប្រភេទរឿង:</span>
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="bg-slate-50 text-slate-900 text-xs px-3 py-1.5 rounded-xl border border-slate-200 font-medium focus:outline-none"
              >
                <option value="all">គ្រប់ប្រភេទ (All Genres)</option>
                {genres.map((g) => (
                  <option key={g.id} value={g.name}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Dropdown */}
            <div className="flex items-center space-x-2">
              <span className="text-slate-500">ឆ្នាំផលិត:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-slate-50 text-slate-900 text-xs px-3 py-1.5 rounded-xl border border-slate-200 font-medium focus:outline-none"
              >
                <option value="all">គ្រប់ឆ្នាំ (All Years)</option>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    ឆ្នាំ {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center space-x-2">
              <span className="text-slate-500">តម្រៀបតាម:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-50 text-slate-900 text-xs px-3 py-1.5 rounded-xl border border-slate-200 font-medium focus:outline-none"
              >
                <option value="latest">រឿងថ្មីៗ (Latest)</option>
                <option value="popular">មើលច្រើនបំផុត (Most Viewed)</option>
                <option value="rating">ពិន្ទុខ្ពស់បំផុត (Top Rated)</option>
                <option value="title">តាមអក្សរ (Title A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Grid */}
        <MovieGrid
          movies={results}
          title={query ? `លទ្ធផលស្វែងរកសម្រាប់ "${query}"` : 'បញ្ជីរឿងទាំងអស់'}
          subtitle={`រកឃើញ ${results.length} ភាពយន្ត`}
        />
      </div>
    </UserLayout>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-slate-500">Loading Search...</div>}>
      <SearchContent />
    </Suspense>
  );
}
