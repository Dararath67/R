'use client';

import React from 'react';
import { MovieCard } from './MovieCard';
import { Movie } from '@/lib/types';

interface MovieGridProps {
  movies: Movie[];
  title?: string;
  subtitle?: string;
  loading?: boolean;
  showRankBadges?: boolean;
}

export const MovieGrid: React.FC<MovieGridProps> = ({
  movies,
  title,
  subtitle,
  loading = false,
  showRankBadges = false,
}) => {
  return (
    <section className="space-y-4">
      {title && (
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-1">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
              <span className="w-2 h-6 bg-brand-red rounded-full inline-block mr-1"></span>
              <span>{title}</span>
            </h2>
            {subtitle && <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">{subtitle}</p>}
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse bg-slate-200 rounded-2xl aspect-[2/3] w-full" />
          ))}
        </div>
      ) : movies.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-2 shadow-sm">
          <p className="text-slate-500 font-medium">No movies found in this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
          {movies.map((movie, index) => (
            <MovieCard key={movie.id} movie={movie} rankBadge={showRankBadges ? index + 1 : undefined} />
          ))}
        </div>
      )}
    </section>
  );
};
