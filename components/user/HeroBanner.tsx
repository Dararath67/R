'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Info, Star, Heart, X, ChevronLeft, ChevronRight, Radio } from 'lucide-react';
import { TrailerModal } from '@/components/user/TrailerModal';
import { Movie, CustomBannerItem, BannerSettings } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';

interface HeroBannerProps {
  movie?: Movie;
  movies?: Movie[];
  customBanners?: CustomBannerItem[];
  customHeadline?: string;
  customSubtitle?: string;
  customBannerUrl?: string;
  announcementSettings?: BannerSettings;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  movie,
  movies = [],
  customBanners = [],
  customHeadline,
  customSubtitle,
  customBannerUrl,
  announcementSettings,
}) => {
  const { toggleFavorite, isFavorite } = useAuth();
  const { bannerSettings } = useData();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [showTrailerModal, setShowTrailerModal] = useState(false);
  const [dismissAnnouncement, setDismissAnnouncement] = useState(false);

  const activeAnnouncement = announcementSettings || bannerSettings;
  const showAnnouncementWidget =
    activeAnnouncement &&
    activeAnnouncement.showAnnouncement !== false &&
    !dismissAnnouncement &&
    (activeAnnouncement.announcementTitle || activeAnnouncement.announcementText);

  // If custom uploaded photo banners exist, use them!
  const hasCustomPhotos = customBanners && customBanners.length > 0;

  const totalSlides = hasCustomPhotos
    ? customBanners.length
    : movies && movies.length > 0
    ? movies.length
    : movie
    ? 1
    : 0;

  // Auto-play slider every 5 seconds (paused on hover or modal open)
  useEffect(() => {
    if (totalSlides <= 1 || isHovered || showTrailerModal) return;

    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % totalSlides);
    }, 5000);

    return () => clearInterval(timer);
  }, [totalSlides, isHovered, showTrailerModal]);

  if (totalSlides === 0) {
    return null;
  }

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? totalSlides - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  };

  // Render for Custom Photo Banners
  if (hasCustomPhotos) {
    const activePhoto = customBanners[currentIndex] || customBanners[0];

    return (
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative w-full h-[65vh] sm:h-[75vh] md:h-[82vh] overflow-hidden bg-slate-900 group/banner"
      >
        {/* Full 100% Brightness Custom Photo Image */}
        <div className="absolute inset-0 z-0 transition-opacity duration-700">
          <img
            key={`photo-${activePhoto.id}-${currentIndex}`}
            src={activePhoto.imageUrl}
            alt={activePhoto.title || 'Hero Banner'}
            className="w-full h-full object-cover object-center animate-fade-in"
          />
          {/* Subtle gradient at bottom for text contrast */}
          {(activePhoto.title || customHeadline || activePhoto.subtitle || customSubtitle) && (
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
          )}
        </div>

        {/* Left/Right Navigation Arrow Buttons */}
        {totalSlides > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-black/40 hover:bg-brand-red text-white backdrop-blur-md border border-white/20 shadow-xl transition-all duration-200 hover:scale-110 active:scale-95"
              title="Banner មុន (Previous Slide)"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-black/40 hover:bg-brand-red text-white backdrop-blur-md border border-white/20 shadow-xl transition-all duration-200 hover:scale-110 active:scale-95"
              title="Banner បន្ទាប់ (Next Slide)"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {/* Right-Side Hero Banner Floating Announcement Card */}
        {showAnnouncementWidget && (
          <div className="absolute right-4 sm:right-10 top-20 sm:top-24 z-40 max-w-[280px] sm:max-w-xs md:max-w-sm animate-fade-in">
            <div
              className={`p-4 sm:p-5 rounded-3xl backdrop-blur-xl shadow-2xl border space-y-2 relative overflow-hidden transition-all ${
                activeAnnouncement.announcementColor === 'yellow'
                  ? 'bg-amber-500/95 text-slate-950 border-amber-300/80 shadow-amber-500/20'
                  : activeAnnouncement.announcementColor === 'blue'
                  ? 'bg-blue-900/95 text-white border-blue-400/50 shadow-blue-900/30'
                  : activeAnnouncement.announcementColor === 'dark'
                  ? 'bg-slate-900/95 text-white border-slate-700/80 shadow-slate-950/50'
                  : 'bg-red-950/95 text-white border-red-500/60 shadow-red-950/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-white shadow-xs">
                  <Radio className="w-3 h-3 text-white animate-pulse" />
                  <span>{activeAnnouncement.announcementTitle || 'ANNOUNCEMENT'}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDismissAnnouncement(true);
                  }}
                  className="text-white/70 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                  title="បិទសារជូនដំណឹង"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1">
                <h4 className="text-sm sm:text-base font-black tracking-wide leading-tight text-white">
                  {activeAnnouncement.announcementTitle}
                </h4>
                <p className="text-xs text-white/90 font-semibold leading-relaxed line-clamp-3">
                  {activeAnnouncement.announcementText}
                </p>
              </div>

              {activeAnnouncement.announcementDate && (
                <span className="text-[9px] text-white/60 font-mono block pt-0.5">
                  {activeAnnouncement.announcementDate}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Optional Title/Subtitle Overlay */}
        <div className="relative z-20 max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-end pb-10 sm:pb-14">
          <div className="max-w-2xl space-y-3 sm:space-y-4">
            {(activePhoto.title || customHeadline) && (
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-xl">
                {activePhoto.title || customHeadline}
              </h1>
            )}

            {(activePhoto.subtitle || customSubtitle) && (
              <p className="text-sm sm:text-base text-slate-100 line-clamp-2 leading-relaxed drop-shadow-md max-w-xl font-semibold">
                {activePhoto.subtitle || customSubtitle}
              </p>
            )}

            {movies && movies[0] && (
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  href={`/watch/${movies[0].id}`}
                  className="flex items-center space-x-2.5 px-6 py-3 bg-brand-red hover:bg-brand-crimson text-white font-extrabold text-xs sm:text-sm rounded-full shadow-lg shadow-brand-red/40 transition-all duration-200 hover:scale-105"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>ទស្សនាឥឡូវនេះ (Watch Now)</span>
                </Link>
              </div>
            )}

            {/* Carousel Dots Indicator */}
            {totalSlides > 1 && (
              <div className="flex items-center space-x-2 pt-2">
                {customBanners.map((b, idx) => (
                  <button
                    key={b.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`transition-all duration-300 rounded-full ${
                      idx === currentIndex
                        ? 'w-8 h-2.5 bg-brand-red ring-2 ring-white/50 shadow-md'
                        : 'w-2.5 h-2.5 bg-white/60 hover:bg-white'
                    }`}
                    title={`Banner ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Fallback to Movie Banners
  const activeMovie = movies[currentIndex] || movie || movies[0];
  if (!activeMovie) return null;

  const favorite = isFavorite(activeMovie.id);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative w-full h-[75vh] sm:h-[82vh] md:h-[88vh] overflow-hidden bg-slate-950 group/banner"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-red-950/80 via-slate-950 to-slate-950 z-0" />

      <div className="absolute inset-0 z-0 opacity-40 transition-opacity duration-1000">
        <img
          key={`bg-${activeMovie.id}`}
          src={customBannerUrl && currentIndex === 0 ? customBannerUrl : (activeMovie.backdropUrl || activeMovie.posterUrl)}
          alt={activeMovie.title}
          className="w-full h-full object-cover object-center scale-105 transition-transform duration-1000 blur-xs animate-fade-in"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-transparent w-full md:w-3/4" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />
      </div>

      <div className="hidden md:block absolute right-8 top-1/2 -translate-y-1/2 z-0 font-black text-[12vw] text-white/5 uppercase select-none pointer-events-none tracking-tighter leading-none truncate max-w-[50%] transition-all duration-700">
        {activeMovie.title}
      </div>

      {activeMovie.posterUrl && (
        <div className="hidden lg:flex absolute right-12 top-1/2 -translate-y-1/2 z-10 items-center justify-center pointer-events-none">
          <div className="w-64 xl:w-72 aspect-[2/3] rounded-3xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.8)] border border-white/10 ring-1 ring-white/20 transform rotate-1 hover:rotate-0 transition-transform duration-500">
            <img
              key={`poster-${activeMovie.id}`}
              src={activeMovie.posterUrl}
              alt={activeMovie.title}
              className="w-full h-full object-cover animate-fade-in"
            />
          </div>
        </div>
      )}

      {totalSlides > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-slate-950/60 hover:bg-brand-red text-white/80 hover:text-white backdrop-blur-md border border-white/10 hover:border-brand-red shadow-xl transition-all duration-200 opacity-80 hover:opacity-100 hover:scale-110 active:scale-95"
            title="Banner មុន (Previous Slide)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-slate-950/60 hover:bg-brand-red text-white/80 hover:text-white backdrop-blur-md border border-white/10 hover:border-brand-red shadow-xl transition-all duration-200 opacity-80 hover:opacity-100 hover:scale-110 active:scale-95"
            title="Banner បន្ទាប់ (Next Slide)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Right-Side Hero Banner Floating Announcement Card */}
      {showAnnouncementWidget && (
        <div className="absolute right-4 sm:right-10 top-20 sm:top-24 z-40 max-w-[280px] sm:max-w-xs md:max-w-sm animate-fade-in">
          <div
            className={`p-4 sm:p-5 rounded-3xl backdrop-blur-xl shadow-2xl border space-y-2 relative overflow-hidden transition-all ${
              activeAnnouncement.announcementColor === 'yellow'
                ? 'bg-amber-500/95 text-slate-950 border-amber-300/80 shadow-amber-500/20'
                : activeAnnouncement.announcementColor === 'blue'
                ? 'bg-blue-900/95 text-white border-blue-400/50 shadow-blue-900/30'
                : activeAnnouncement.announcementColor === 'dark'
                ? 'bg-slate-900/95 text-white border-slate-700/80 shadow-slate-950/50'
                : 'bg-red-950/95 text-white border-red-500/60 shadow-red-950/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-white shadow-xs">
                <Radio className="w-3 h-3 text-white animate-pulse" />
                <span>{activeAnnouncement.announcementTitle || 'ANNOUNCEMENT'}</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDismissAnnouncement(true);
                }}
                className="text-white/70 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                title="បិទសារជូនដំណឹង"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <h4 className="text-sm sm:text-base font-black tracking-wide leading-tight text-white">
                {activeAnnouncement.announcementTitle}
              </h4>
              <p className="text-xs text-white/90 font-semibold leading-relaxed line-clamp-3">
                {activeAnnouncement.announcementText}
              </p>
            </div>

            {activeAnnouncement.announcementDate && (
              <span className="text-[9px] text-white/60 font-mono block pt-0.5">
                {activeAnnouncement.announcementDate}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="relative z-20 max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center">
        <div className="max-w-2xl space-y-4 sm:space-y-6 pt-16 sm:pt-20">
          <div className="flex items-center space-x-3 text-xs sm:text-sm">
            <span className="bg-brand-red text-white px-3.5 py-1 rounded-full font-bold uppercase tracking-wider shadow-lg shadow-brand-red/30">
              {activeMovie.type === 'series' ? 'រឿងភាគពិសេស' : 'ភាពយន្តពិសេស'}
            </span>
            <span className="flex items-center text-amber-400 font-bold bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full border border-amber-400/30">
              <Star className="w-3.5 h-3.5 fill-amber-400 mr-1" />
              {activeMovie.rating}
            </span>
            <span className="text-slate-200 font-bold">{activeMovie.releaseYear}</span>
            <span className="text-slate-300 border border-slate-700 px-2.5 py-0.5 rounded text-xs font-semibold">
              4K Ultra HD
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight drop-shadow-2xl">
            {currentIndex === 0 && customHeadline ? customHeadline : activeMovie.title}
          </h1>

          <p className="text-sm sm:text-base text-slate-200 line-clamp-3 leading-relaxed drop-shadow max-w-xl">
            {currentIndex === 0 && customSubtitle ? customSubtitle : activeMovie.description}
          </p>

          <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-2">
            <Link
              href={`/watch/${activeMovie.id}`}
              className="flex items-center space-x-2.5 px-7 py-3.5 bg-gradient-to-r from-red-800 via-brand-red to-red-600 hover:from-red-700 hover:to-red-500 text-white font-black text-sm rounded-full shadow-xl shadow-red-950/70 border border-red-500/50 hover:scale-105 transition-all duration-200"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>ទស្សនាឥឡូវនេះ (Watch Now)</span>
            </Link>

            <button
              onClick={() => setShowTrailerModal(true)}
              className="flex items-center space-x-2 px-6 py-3.5 bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-white font-bold text-sm backdrop-blur-md rounded-full hover:scale-105 transition-all duration-200"
            >
              <Info className="w-4 h-4 text-slate-200" />
              <span>មើល Trailer (Explore)</span>
            </button>

            <button
              onClick={() => toggleFavorite(activeMovie.id)}
              className={`p-3.5 rounded-full border backdrop-blur-md transition-all duration-200 ${
                favorite
                  ? 'bg-brand-red/30 border-brand-red text-white'
                  : 'bg-white/10 border-white/20 text-slate-200 hover:text-white'
              }`}
              title={favorite ? 'លុបចេញពីបញ្ជី' : 'បន្ថែមក្នុងបញ្ជី'}
            >
              <Heart className={`w-4 h-4 ${favorite ? 'fill-brand-red text-brand-red' : ''}`} />
            </button>
          </div>

          {totalSlides > 1 && (
            <div className="flex items-center space-x-2.5 pt-3">
              {movies.map((b, idx) => (
                <button
                  key={b.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`transition-all duration-300 rounded-full ${
                    idx === currentIndex
                      ? 'w-8 h-3 bg-brand-red ring-4 ring-brand-red/30 shadow-md'
                      : 'w-3 h-3 bg-white/40 hover:bg-white/70'
                  }`}
                  title={`Banner ${idx + 1}: ${b.title}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <TrailerModal
        isOpen={showTrailerModal}
        onClose={() => setShowTrailerModal(false)}
        title={activeMovie.title}
        trailerUrl={activeMovie.trailerUrl || activeMovie.videoUrl}
      />
    </div>
  );
};
