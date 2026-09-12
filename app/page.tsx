'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { UserLayout } from '@/components/user/UserLayout';
import { HeroBanner } from '@/components/user/HeroBanner';
import { MovieGrid } from '@/components/user/MovieGrid';
import { ContinueWatchingSection } from '@/components/user/ContinueWatchingSection';
import { useData } from '@/context/DataContext';
import { Megaphone, Filter, Film, ShieldCheck, Loader2, Play, Radio } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { isGenreMatch } from '@/lib/initialData';

export default function HomePage() {
  const { movies, series, genres, bannerSettings, isLoaded } = useData();
  const { isAuthenticated } = useAuth();
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const allContent = [...movies, ...series].filter((m) => m.isPublished);

  // Featured Content List for Hero Carousel
  const featuredList = React.useMemo(() => {
    let list: typeof allContent = [];
    if (bannerSettings?.featuredMovieIds && bannerSettings.featuredMovieIds.length > 0) {
      const selected = allContent.filter((m) => bannerSettings.featuredMovieIds?.includes(m.id) && m.isFeatured !== false);
      list = [...selected];
    } else if (bannerSettings?.featuredMovieId) {
      const single = allContent.find((m) => m.id === bannerSettings.featuredMovieId && m.isFeatured !== false);
      if (single) list.push(single);
    }

    if (list.length === 0) {
      // Filter strictly by m.isFeatured === true so movies with isFeatured = false are never displayed in Hero Banner
      list = allContent.filter((m) => m.isFeatured === true);
    }

    return list.slice(0, 6);
  }, [allContent, bannerSettings]);

  // Category Filtering
  const filteredContent =
    selectedGenre === 'all'
      ? allContent
      : allContent.filter((m) => isGenreMatch(m.genres, selectedGenre));

  const trendingMovies = filteredContent.filter((m) => m.isTrending);
  const popularMovies = filteredContent.filter((m) => m.isPopular);
  const latestMovies = [...filteredContent].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  const recommendedMovies = filteredContent.filter((m) => m.isLatest);

  return (
    <UserLayout>
      {/* Hero Banner or Loading Skeleton or Empty State */}
      {bannerSettings?.customBanners && bannerSettings.customBanners.length > 0 ? (
        <HeroBanner
          customBanners={bannerSettings.customBanners}
          movies={featuredList}
          customHeadline={bannerSettings.customHeadline}
          customSubtitle={bannerSettings.customSubtitle}
          customBannerUrl={bannerSettings.customBannerUrl}
          announcementSettings={bannerSettings}
        />
      ) : featuredList.length > 0 ? (
        <HeroBanner
          movies={featuredList}
          customHeadline={bannerSettings.customHeadline}
          customSubtitle={bannerSettings.customSubtitle}
          customBannerUrl={bannerSettings.customBannerUrl}
          announcementSettings={bannerSettings}
        />
      ) : !isLoaded ? (
        <div className="w-full h-[70vh] sm:h-[80vh] bg-slate-950 animate-pulse flex items-center justify-center">
          <div className="flex items-center space-x-3 text-white/50">
            <Film className="w-8 h-8 animate-spin" />
            <span className="text-sm font-bold">កំពុងទាញយកទិន្នន័យ...</span>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white py-20 sm:py-24 px-4 border-b border-slate-800">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="inline-flex p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-xl">
              <Film className="w-10 h-10" />
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase">
              TERK TLA STREAMING PLATFORM
            </h1>
            <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto">
              សូមស្វាគមន៍មកកាន់ TERK TLA! ទស្សនាភាពយន្ត និងរឿងភាគល្បីៗ គុណភាព 4K Ultra HD ដោយឥតគិតថ្លៃ។
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/movies"
                className="px-7 py-3.5 bg-brand-red hover:bg-red-700 text-white font-extrabold rounded-full shadow-xl shadow-brand-red/40 flex items-center space-x-2 text-sm transition-all hover:scale-105"
              >
                <Film className="w-4 h-4" />
                <span>ស្វែងរកភាពយន្តទាំងអស់ (Explore Movies)</span>
              </Link>
              {!isAuthenticated && (
                <Link
                  href="/login"
                  className="px-7 py-3.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-full backdrop-blur-md flex items-center space-x-2 text-sm transition-all hover:scale-105"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>ចូលប្រើប្រាស់ (Sign In)</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {/* Continue Watching Section for In-Progress Movies */}
        <ContinueWatchingSection />

        {/* Genre / Category Filter Bar */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-sm font-bold text-slate-800">
            <Filter className="w-4 h-4 text-brand-red" />
            <span>ប្រភេទ &amp; ជម្រើសភាពយន្ត:</span>
          </div>
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setSelectedGenre('all')}
              className={`px-4 py-2 rounded-full text-xs font-extrabold whitespace-nowrap transition-all duration-75 active:duration-0 ease-out transform active:scale-95 hover:scale-[1.02] ${
                selectedGenre === 'all'
                  ? 'bg-brand-red text-white shadow-md shadow-brand-red/30 ring-2 ring-brand-red/30 scale-[1.02]'
                  : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 shadow-2xs'
              }`}
            >
              <span>មាតិកាទាំងអស់ ({mounted ? allContent.length : 0})</span>
            </button>
            {genres.map((g) => (
              <button
                key={g.id}
                onClick={() => setSelectedGenre(g.name)}
                className={`px-4 py-2 rounded-full text-xs font-extrabold whitespace-nowrap transition-all duration-75 active:duration-0 ease-out transform active:scale-95 hover:scale-[1.02] ${
                  selectedGenre === g.name
                    ? 'bg-brand-red text-white shadow-md shadow-brand-red/30 ring-2 ring-brand-red/30 scale-[1.02]'
                    : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 shadow-2xs'
                }`}
              >
                {g.name}
              </button>
            ))}
          </div>
        </div>

        {/* Empty Catalog Notice or Movie Lists */}
        {!isLoaded ? (
          <MovieGrid movies={[]} loading={true} />
        ) : allContent.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4 shadow-sm">
            <div className="inline-flex p-4 rounded-full bg-slate-100 text-slate-400">
              <Film className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">បណ្ណាល័យភាពយន្តទទេ</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              មានតែភាពយន្តដែលបានបញ្ចូលដោយ Admin ប៉ុណ្ណោះដែលនឹងបង្ហាញនៅទីនេះ។ សូមចូលប្រើប្រាស់ជា Admin ដើម្បីបញ្ចូលភាពយន្ត ឬរឿងភាគថ្មីៗ។
            </p>
          </div>
        ) : (
          <div className="space-y-12" suppressHydrationWarning>
            {trendingMovies.length > 0 && (
              <MovieGrid
                movies={trendingMovies.slice(0, 10)}
                title="កំពុងពេញនិយមខ្លាំង (Top 10 Trends)"
                subtitle="ភាពយន្ត និងរឿងភាគដែលមានអ្នកមើលច្រើនជាងគេប្រចាំថ្ងៃ"
                showRankBadges={true}
              />
            )}

            {popularMovies.length > 0 && (
              <MovieGrid
                movies={popularMovies}
                title="ភាពយន្ត និងរឿងភាគល្បីៗ"
                subtitle="មាតិកាពេញនិយមពិសេស"
              />
            )}

            {latestMovies.length > 0 && (
              <MovieGrid
                movies={latestMovies}
                title="ភាពយន្តបញ្ចូលថ្មីៗ"
                subtitle="ចំណងជើងដែលទើបតែបោះពុម្ពផ្សាយ"
              />
            )}

            {recommendedMovies.length > 0 && (
              <MovieGrid
                movies={recommendedMovies}
                title="ភាពយន្តណែនាំពិសេស"
              />
            )}

            {/* Fallback to show all published movies if no section toggles are active */}
            {trendingMovies.length === 0 &&
              popularMovies.length === 0 &&
              latestMovies.length === 0 &&
              recommendedMovies.length === 0 &&
              filteredContent.length > 0 && (
                <MovieGrid
                  movies={filteredContent}
                  title="ភាពយន្តទាំងអស់ (All Movies)"
                  subtitle="បណ្ណាល័យភាពយន្តដែលបានបោះពុម្ពផ្សាយ"
                />
              )}
          </div>
        )}
      </div>
    </UserLayout>
  );
}
