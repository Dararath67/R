'use client';

import React from 'react';
import Link from 'next/link';
import { Play, Star, Heart, Tv, Film } from 'lucide-react';
import { Movie } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';

interface MovieCardProps {
  movie: Movie;
  rankBadge?: number;
}

export const MovieCard: React.FC<MovieCardProps> = ({ movie, rankBadge }) => {
  const { toggleFavorite, isFavorite } = useAuth();
  const favorite = isFavorite(movie.id);

  return (
    <div className="group relative bg-white rounded-3xl overflow-hidden border border-slate-200/90 hover:border-brand-red/50 shadow-sm hover:shadow-2xl hover:shadow-brand-red/10 transition-all duration-300 flex flex-col h-full hover:-translate-y-1">
      {/* Poster Container */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-100">
        <img
          src={movie.posterUrl}
          alt={movie.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          loading="lazy"
        />

        {/* Top 10 Rank Badge */}
        {rankBadge && (
          <div className="absolute top-0 left-0 z-20 bg-gradient-to-r from-red-600 to-brand-red text-white text-[11px] font-black px-3 py-1 rounded-br-2xl shadow-lg border-r border-b border-red-400 flex items-center space-x-1">
            <span className="text-amber-300 text-xs">#{rankBadge}</span>
            <span className="uppercase tracking-wider text-[9px]">TOP 10</span>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
          {!rankBadge ? (
            <span className="flex items-center space-x-1 text-xs font-black text-white bg-gradient-to-r from-amber-500 to-amber-600 px-2.5 py-1 rounded-xl shadow-md border border-amber-400/40">
              <Star className="w-3.5 h-3.5 fill-white" />
              <span>{movie.rating.toFixed(1)}</span>
            </span>
          ) : <div />}

          <button
            suppressHydrationWarning
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFavorite(movie.id);
            }}
            className={`p-2.5 rounded-full backdrop-blur-md shadow-md transition-all ${
              favorite
                ? 'bg-brand-red text-white scale-110 shadow-brand-red/40'
                : 'bg-white/80 text-slate-700 hover:text-brand-red hover:bg-white hover:scale-110'
            }`}
            title={favorite ? 'លុបចេញពីបញ្ជី' : 'បន្ថែមក្នុងបញ្ជី'}
          >
            <Heart className={`w-4 h-4 ${favorite ? 'fill-white' : ''}`} />
          </button>
        </div>

        {/* Hover Overlay Play Button */}
        <Link
          href={`/movie/${movie.id}`}
          className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center z-20"
        >
          <div className="w-14 h-14 rounded-full bg-brand-red text-white flex items-center justify-center shadow-xl shadow-brand-red/50 transform group-hover:scale-110 transition-transform duration-300">
            <Play className="w-7 h-7 fill-white ml-0.5" />
          </div>
        </Link>

        {/* Content Type Tag */}
        <div className="absolute bottom-3 left-3 z-10">
          <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-900 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-200/80 shadow-sm flex items-center space-x-1">
            {movie.type === 'series' ? (
              <>
                <Tv className="w-3 h-3 text-brand-red" />
                <span>រឿងភាគ</span>
              </>
            ) : (
              <>
                <Film className="w-3 h-3 text-brand-accent" />
                <span>ភាពយន្ត</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Info Container */}
      <div className="p-4 flex flex-col justify-between flex-grow space-y-2.5">
        <div>
          <Link
            href={`/movie/${movie.id}`}
            className="text-base font-black text-slate-900 hover:text-brand-red transition-colors line-clamp-1 leading-snug tracking-tight"
          >
            {movie.title}
          </Link>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-1 font-semibold">
            <span className="bg-slate-100 px-2 py-0.5 rounded-md">{movie.releaseYear}</span>
            <span>{movie.duration}</span>
          </div>
        </div>

        {/* Primary Genre Tags */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {movie.genres.slice(0, 2).map((genre) => (
            <span
              key={genre}
              className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2.5 py-0.5 rounded-md border border-slate-200/60"
            >
              {genre}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
