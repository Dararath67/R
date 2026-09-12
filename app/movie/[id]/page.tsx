'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { UserLayout } from '@/components/user/UserLayout';
import { MovieGrid } from '@/components/user/MovieGrid';
import { CommentSection } from '@/components/user/CommentSection';
import { TrailerModal } from '@/components/user/TrailerModal';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { isGenreMatch } from '@/lib/initialData';
import {
  Play,
  Star,
  Heart,
  Calendar,
  Clock,
  Tv,
  X,
  User as DirectorIcon,
  Users,
  UploadCloud,
} from 'lucide-react';

export default function MovieDetailPage() {
  const { id } = useParams();
  const { movies, series, episodes } = useData();
  const { toggleFavorite, isFavorite } = useAuth();
  const [showTrailer, setShowTrailer] = useState(false);

  const allContent = [...movies, ...series];
  const item = allContent.find((m) => m.id === id);

  if (!item) {
    return (
      <UserLayout>
        <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">Movie or Series Not Found</h2>
          <p className="text-slate-500">The content you are looking for does not exist or has been removed.</p>
          <Link
            href="/"
            className="inline-block bg-brand-red text-white px-6 py-2.5 rounded-xl font-bold"
          >
            Back to Home
          </Link>
        </div>
      </UserLayout>
    );
  }

  const favorite = isFavorite(item.id);
  const seriesEpisodes = episodes.filter((ep) => ep.seriesId === item.id);
  const similarItems = allContent
    .filter((m) => m.id !== item.id && item.genres.some((itemG) => isGenreMatch(m.genres, itemG)))
    .slice(0, 6);

  return (
    <UserLayout>
      {/* Backdrop Header */}
      <div className="relative w-full h-[55vh] sm:h-[65vh] overflow-hidden bg-slate-950">
        <img
          src={item.backdropUrl || item.posterUrl}
          alt={item.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/40 to-transparent" />
      </div>

      {/* Main Details Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-40 sm:-mt-52 relative z-10 space-y-12">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Poster Card */}
          <div className="w-48 sm:w-64 flex-shrink-0 rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-white">
            <img src={item.posterUrl} alt={item.title} className="w-full h-auto object-cover" />
          </div>

          {/* Details Content */}
          <div className="flex-grow space-y-5 pt-2">
            <div className="flex items-center space-x-3 text-xs sm:text-sm">
              <span className="flex items-center space-x-1 text-white font-bold bg-amber-500 px-3 py-1 rounded-lg shadow-sm">
                <Star className="w-4 h-4 fill-white" />
                <span>{item.rating.toFixed(1)}</span>
              </span>
              <span className="flex items-center text-slate-200 font-semibold">
                <Calendar className="w-4 h-4 mr-1 text-brand-red" />
                {item.releaseYear}
              </span>
              <span className="flex items-center text-slate-200 font-semibold">
                <Clock className="w-4 h-4 mr-1 text-brand-red" />
                {item.duration}
              </span>
              <span className="uppercase text-xs font-bold bg-white/20 text-white backdrop-blur-md px-2.5 py-0.5 rounded-md">
                {item.type}
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight drop-shadow-md">
              {item.title}
            </h1>

            {/* Genres */}
            <div className="flex flex-wrap gap-2">
              {item.genres.map((g) => (
                <span
                  key={g}
                  className="text-xs bg-white/90 backdrop-blur-md text-slate-900 px-3 py-1 rounded-lg font-bold shadow-sm"
                >
                  {g}
                </span>
              ))}
            </div>

            <p className="text-sm sm:text-base text-slate-100 leading-relaxed max-w-3xl drop-shadow">
              {item.description}
            </p>

            {/* Director, Cast, Uploader & Date Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs sm:text-sm border-t border-b border-slate-200 py-4">
              <div className="flex items-center space-x-2">
                <DirectorIcon className="w-4 h-4 text-brand-red shrink-0" />
                <span className="text-slate-700 font-bold">អ្នកដឹកនាំ:</span>
                <span className="text-slate-900 font-black">{item.director || 'មិនមាន'}</span>
              </div>

              <div className="flex items-start space-x-2">
                <Users className="w-4 h-4 text-brand-red mt-0.5 shrink-0" />
                <span className="text-slate-700 font-bold">តួសម្តែង:</span>
                <span className="text-slate-900 font-black">
                  {item.cast && item.cast.length > 0 ? item.cast.join(', ') : 'មិនមាន'}
                </span>
              </div>

              {/* Uploader Profile Badge */}
              <div className="flex items-center space-x-2.5">
                <UploadCloud className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-slate-700 font-bold">អ្នកអាប់ឡូត:</span>
                <div className="flex items-center space-x-2 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 shadow-2xs">
                  {item.uploadedByAvatar ? (
                    <img
                      src={item.uploadedByAvatar}
                      alt={item.uploadedByUserName || 'Uploader'}
                      className="w-5 h-5 rounded-full object-cover border border-amber-500"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] flex items-center justify-center">
                      {(item.uploadedByUserName || 'A')[0].toUpperCase()}
                    </div>
                  )}
                  <span className="text-slate-900 font-black text-xs">
                    {item.uploadedByUserName || 'Master Admin'}
                  </span>
                </div>
              </div>

              {/* Auto Upload Date */}
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-slate-700 font-bold">ថ្ងៃខែអាប់ឡូត:</span>
                <span className="text-emerald-700 font-black bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 rounded-lg text-xs">
                  {item.createdAt ? new Date(item.createdAt).toLocaleDateString('km-KH', { year: 'numeric', month: 'short', day: 'numeric' }) : new Date().toLocaleDateString('km-KH')}
                </span>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex items-center space-x-3 pt-2 flex-wrap gap-y-2">
              <Link
                href={`/watch/${item.id}`}
                className="flex items-center space-x-2 px-6 py-3.5 bg-brand-red hover:bg-brand-crimson text-white font-extrabold rounded-2xl shadow-xl shadow-brand-red/30 hover:scale-105 transition-all text-sm"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>ទស្សនា {item.type === 'series' ? 'រឿងភាគ' : 'ភាពយន្ត'}</span>
              </Link>

              <Link
                href={`/watch-party/room-new?movie=${item.id}`}
                className="flex items-center space-x-2 px-5 py-3.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-2xl shadow-xl shadow-amber-500/30 hover:scale-105 transition-all text-sm"
              >
                <Users className="w-5 h-5" />
                <span>មើលជុំគ្នា (Watch Party)</span>
              </Link>

              <button
                onClick={() => setShowTrailer(true)}
                className="px-5 py-3.5 bg-white text-slate-900 font-bold rounded-2xl border border-slate-200 shadow-md hover:bg-slate-50 transition-all text-sm"
              >
                Trailer
              </button>

              <button
                onClick={() => toggleFavorite(item.id)}
                className={`p-3.5 rounded-2xl border backdrop-blur-md transition-all ${
                  favorite
                    ? 'bg-brand-red text-white border-brand-red'
                    : 'bg-white text-slate-700 border-slate-200 hover:text-brand-red'
                }`}
              >
                <Heart className={`w-5 h-5 ${favorite ? 'fill-white' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Series Episodes List Section (If Series) */}
        {item.type === 'series' && (
          <div className="space-y-4 pt-8">
            <h2 className="text-2xl font-black text-slate-900 flex items-center space-x-2">
              <Tv className="w-6 h-6 text-brand-red" />
              <span>បញ្ជីភាគទស្សនា</span>
            </h2>
            {seriesEpisodes.length === 0 ? (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 text-slate-500 font-medium shadow-sm">
                មិនទាន់មានភាគត្រូវបានបញ្ចូលសម្រាប់រឿងភាគនេះនៅឡើយទេ។
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {seriesEpisodes.map((ep) => (
                  <Link
                    key={ep.id}
                    href={`/watch/${item.id}?ep=${ep.id}`}
                    className="bg-white border border-slate-200 hover:border-brand-red p-3.5 rounded-2xl flex space-x-3 group transition-all shadow-sm"
                  >
                    <div className="relative w-28 aspect-video rounded-xl overflow-hidden bg-slate-900 flex-shrink-0">
                      <img
                        src={ep.thumbnailUrl || item.posterUrl}
                        alt={ep.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-6 h-6 text-white fill-white" />
                      </div>
                    </div>
                    <div className="flex flex-col justify-between py-1">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-brand-red line-clamp-1">
                          {ep.title}
                        </h4>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-0.5 font-medium">
                          {ep.description}
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono font-semibold">{ep.duration}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Comment & Star Rating Section */}
        <div className="pt-8">
          <CommentSection movieId={item.id} />
        </div>

        {/* Similar / Recommended Content */}
        {similarItems.length > 0 && (
          <div className="pt-8">
            <MovieGrid
              movies={similarItems}
              title="ភាពយន្ត និងរឿងភាគស្រដៀងគ្នា"
              subtitle="មាតិកាក្នុងប្រភេទដូចគ្នា"
            />
          </div>
        )}
      </div>

      {/* Trailer Modal */}
      <TrailerModal
        isOpen={showTrailer}
        onClose={() => setShowTrailer(false)}
        title={item.title}
        trailerUrl={item.trailerUrl || item.videoUrl}
      />
    </UserLayout>
  );
}
