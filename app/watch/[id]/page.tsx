'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserLayout } from '@/components/user/UserLayout';
import { CustomVideoPlayer } from '@/components/user/CustomVideoPlayer';
import { CommentSection } from '@/components/user/CommentSection';
import { saveProgressItem, getProgressMap } from '@/components/user/ContinueWatchingSection';
import { MovieCard } from '@/components/user/MovieCard';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, Heart, Play, Star, ListVideo, AlertTriangle, Bell, AlertCircle, Lock, UserPlus, LogIn } from 'lucide-react';
import { ReportVideoModal } from '@/components/user/ReportVideoModal';
import { api } from '@/lib/api';

export default function WatchPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params?.id as string;
  const epParam = searchParams.get('ep');

  const { movies, series, episodes, bannerSettings } = useData();
  const { toggleFavorite, isFavorite, recordHistory, isAuthenticated } = useAuth();

  const isRequireLogin = bannerSettings?.requireLoginToWatch !== false;
  const isBlocked = isRequireLogin && !isAuthenticated;

  const allContent = [...movies, ...series];
  const item = allContent.find((m) => m.id === id);

  const seriesEpisodes = item ? episodes.filter((ep) => ep.seriesId === item.id) : [];
  const activeEpisode = seriesEpisodes.find((ep) => ep.id === epParam) || seriesEpisodes[0];

  const [server, setServer] = React.useState<'server1' | 'server2'>('server1');
  const [isReportModalOpen, setIsReportModalOpen] = React.useState(false);
  const [isFollowing, setIsFollowing] = React.useState(false);

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
  });

  const showAlert = (title: string, message: string) => {
    setAlertModal({ isOpen: true, title, message });
  };

  useEffect(() => {
    if (id && item?.type === 'series') {
      api.getSeriesFollowStatus(id).then((res) => setIsFollowing(res.isFollowing));
    }
  }, [id, item?.type]);

  const handleToggleFollow = async () => {
    try {
      const res = await api.toggleFollowSeries(id);
      setIsFollowing(res.isFollowing);
    } catch {
      showAlert('សូមចូលប្រើប្រាស់', 'សូមចូលប្រើប្រាស់គណនីមុនពេលតាមដានរឿង!');
    }
  };

  // Multi-server video URL mapping
  const currentVideoSrc = activeEpisode
    ? (server === 'server1' ? activeEpisode.videoUrl : activeEpisode.videoUrl)
    : (server === 'server1' ? item?.videoUrl : item?.videoUrl) || '';

  const currentTitle = activeEpisode ? `${item?.title} - ${activeEpisode.title}` : item?.title || '';

  const progressMap = typeof window !== 'undefined' ? getProgressMap() : {};
  const savedProgressKey = activeEpisode ? `${item?.id}_${activeEpisode.id}` : item?.id;
  const savedTime = savedProgressKey ? progressMap[savedProgressKey]?.currentTime || 0 : 0;

  const handleTimeUpdate = (currentTime: number, duration: number) => {
    if (!item || duration <= 0) return;
    const progress = Math.round((currentTime / duration) * 100);

    saveProgressItem({
      contentId: item.id,
      episodeId: activeEpisode?.id,
      title: activeEpisode ? `${item.title} - ${activeEpisode.title}` : item.title,
      posterUrl: activeEpisode?.thumbnailUrl || item.backdropUrl || item.posterUrl,
      currentTime: Math.round(currentTime),
      duration: Math.round(duration),
      updatedAt: new Date().toISOString(),
    });

    if (progress > 2) {
      recordHistory({
        contentId: item.id,
        contentType: item.type,
        episodeId: activeEpisode?.id,
        progress,
        duration: Math.round(duration),
        currentTime: Math.round(currentTime),
      });
    }
  };

  const handleNextEpisode = () => {
    if (!activeEpisode || seriesEpisodes.length <= 1) return;
    const currentIndex = seriesEpisodes.findIndex((ep) => ep.id === activeEpisode.id);
    if (currentIndex < seriesEpisodes.length - 1) {
      const nextEp = seriesEpisodes[currentIndex + 1];
      router.push(`/watch/${id}?ep=${nextEp.id}`);
    }
  };

  if (!item) {
    return (
      <UserLayout>
        <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">Video Not Found</h2>
          <Link href="/" className="inline-block bg-brand-red text-white px-6 py-2.5 rounded-xl">
            Back to Home
          </Link>
        </div>
      </UserLayout>
    );
  }

  const favorite = isFavorite(item.id);
  const recommended = allContent.filter((m) => m.id !== item.id).slice(0, 4);

  return (
    <UserLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Return Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Link
            href={`/movie/${item.id}`}
            className="flex items-center space-x-2 text-sm text-slate-600 hover:text-brand-red transition-colors font-bold"
          >
            <ArrowLeft className="w-4 h-4 text-brand-red" />
            <span>ត្រឡប់ទៅព័ត៌មានភាពយន្ត</span>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            {item.type === 'series' && (
              <button
                onClick={handleToggleFollow}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                  isFollowing
                    ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:text-amber-600'
                }`}
              >
                <Bell className={`w-4 h-4 ${isFollowing ? 'fill-slate-950' : ''}`} />
                <span>{isFollowing ? 'កំពុងតាមដានរឿងភាគ' : 'តាមដានរឿងភាគ (Follow)'}</span>
              </button>
            )}

            <button
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-all"
              title="រាយការណ៍វីដេអូខូច"
            >
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span>រាយការណ៍វីដេអូខូច</span>
            </button>

            <button
              onClick={() => toggleFavorite(item.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                favorite
                  ? 'bg-brand-red text-white border-brand-red'
                  : 'bg-white border-slate-200 text-slate-700 hover:text-brand-red'
              }`}
            >
              <Heart className={`w-4 h-4 ${favorite ? 'fill-white' : ''}`} />
              <span>{favorite ? 'បានរក្សាទុកក្នុងបញ្ជី' : 'បន្ថែមក្នុងបញ្ជីចូលចិត្ត'}</span>
            </button>
          </div>
        </div>

        {/* Video Player or Login Paywall Lock Overlay */}
        <div className="w-full space-y-3">
          {isBlocked ? (
            <div className="w-full relative rounded-3xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-950 aspect-video flex items-center justify-center p-6 text-center text-white">
              {/* Backdrop Image with dark gradient blur overlay */}
              <img
                src={item.backdropUrl || item.posterUrl}
                alt={item.title}
                className="absolute inset-0 w-full h-full object-cover opacity-25 blur-md scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/90 to-slate-950/70" />

              <div className="relative z-10 max-w-lg space-y-5 animate-scale-up">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-600/20 border-2 border-brand-red text-brand-red flex items-center justify-center mx-auto shadow-xl shadow-brand-red/20 animate-pulse">
                  <Lock className="w-8 h-8 sm:w-10 sm:h-10" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-xl sm:text-3xl font-black text-white leading-tight">
                    សូមចូលប្រើប្រាស់ ឬបង្កើតគណនី
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed max-w-md mx-auto">
                    ដើម្បីទស្សនាភាពយន្ត «<span className="font-bold text-amber-400">{currentTitle}</span>» និងរឿងភាគទាំងអស់ក្នុងប្រព័ន្ធ សូមចូលប្រើប្រាស់ ឬបង្កើតគណនីឥតគិតថ្លៃឥឡូវនេះ!
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <Link
                    href={`/register?redirect=/watch/${id}`}
                    className="w-full sm:w-auto px-6 py-3.5 bg-brand-red hover:bg-red-700 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg shadow-brand-red/40 transition-all hover:scale-105 flex items-center justify-center space-x-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>បង្កើតគណនីថ្មី (Register Free)</span>
                  </Link>
                  <Link
                    href={`/login?redirect=/watch/${id}`}
                    className="w-full sm:w-auto px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs sm:text-sm rounded-2xl transition-all hover:scale-105 flex items-center justify-center space-x-2 backdrop-blur-sm"
                  >
                    <LogIn className="w-4 h-4 text-amber-400" />
                    <span>ចូលប្រើប្រាស់ (Log In)</span>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <>
              <CustomVideoPlayer
                src={currentVideoSrc}
                poster={activeEpisode?.thumbnailUrl || item.backdropUrl || item.posterUrl}
                title={currentTitle}
                subtitles={item.subtitles}
                savedTime={savedTime}
                onNextEpisode={item.type === 'series' ? handleNextEpisode : undefined}
                onTimeUpdate={handleTimeUpdate}
              />

              {/* Multi-Server Selector Bar */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center space-x-2 text-xs font-extrabold text-slate-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>ជ្រើសរើសម៉ាស៊ីនបម្រើទស្សនា (Streaming Server):</span>
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <button
                    onClick={() => setServer('server1')}
                    className={`px-4 py-2 rounded-xl font-bold border transition-all ${
                      server === 'server1'
                        ? 'bg-brand-red text-white border-brand-red shadow-md shadow-brand-red/30'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Server 1 (VIP Fast HD)
                  </button>
                  <button
                    onClick={() => setServer('server2')}
                    className={`px-4 py-2 rounded-xl font-bold border transition-all ${
                      server === 'server2'
                        ? 'bg-brand-red text-white border-brand-red shadow-md shadow-brand-red/30'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Server 2 (Backup Stream)
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Info & Episode Switcher Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">{currentTitle}</h1>
              <div className="flex items-center space-x-2 text-xs">
                <span className="flex items-center text-amber-700 font-bold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 mr-1" />
                  {item.rating}
                </span>
                <span className="text-slate-500 font-bold">{item.releaseYear}</span>
                <span className="text-slate-500 border border-slate-200 px-2 py-0.5 rounded font-bold">
                  {item.duration}
                </span>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed bg-white border border-slate-200 p-4 rounded-2xl shadow-sm font-medium">
              {activeEpisode ? activeEpisode.description : item.description}
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              {item.genres.map((g) => (
                <span
                  key={g}
                  className="text-xs bg-slate-100 text-slate-700 font-bold px-3 py-1 rounded-lg border border-slate-200"
                >
                  {g}
                </span>
              ))}
            </div>
          </div>

          {/* Series Episode Selector */}
          <div className="space-y-4">
            {item.type === 'series' && seriesEpisodes.length > 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2 border-b border-slate-100 pb-2">
                  <ListVideo className="w-4 h-4 text-brand-red" />
                  <span>បញ្ជីភាគទស្សនា ({seriesEpisodes.length})</span>
                </h3>

                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {seriesEpisodes.map((ep) => {
                    const isSelected = activeEpisode?.id === ep.id;
                    return (
                      <button
                        key={ep.id}
                        onClick={() => router.push(`/watch/${id}?ep=${ep.id}`)}
                        className={`w-full text-left p-2.5 rounded-xl border flex items-center space-x-3 transition-all ${
                          isSelected
                            ? 'bg-red-50 border-brand-red text-slate-900'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="relative w-16 aspect-video rounded-lg overflow-hidden bg-slate-900 flex-shrink-0">
                          <img
                            src={ep.thumbnailUrl || item.posterUrl}
                            alt={ep.title}
                            className="w-full h-full object-cover"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-brand-red/60 flex items-center justify-center">
                              <Play className="w-4 h-4 text-white fill-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-grow min-w-0">
                          <p className={`text-xs font-bold truncate ${isSelected ? 'text-brand-red' : 'text-slate-900'}`}>
                            {ep.title}
                          </p>
                          <span className="text-[10px] text-slate-500 font-semibold">{ep.duration}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Recommended Next
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {recommended.map((rec) => (
                    <MovieCard key={rec.id} movie={rec} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Comment & Rating Section */}
        <div className="pt-4">
          <CommentSection movieId={item.id} />
        </div>
      </div>

      {/* Report Video Modal */}
      <ReportVideoModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        contentId={item.id}
        contentTitle={item.title}
        episodeId={activeEpisode?.id}
        episodeTitle={activeEpisode?.title}
      />

      {/* CUSTOM ALERT MODAL PORTAL */}
      {alertModal.isOpen && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-sm sm:max-w-md w-full text-center space-y-4 shadow-2xl text-white">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto bg-brand-red/10 border border-brand-red/30 text-brand-red">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{alertModal.title}</h3>
              <p className="text-xs text-slate-300 mt-1 font-medium">{alertModal.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setAlertModal((prev) => ({ ...prev, isOpen: false }))}
              className="w-full py-3 rounded-2xl bg-brand-red hover:bg-red-700 text-white font-extrabold text-xs transition shadow-lg shadow-brand-red/20"
            >
              យល់ព្រម
            </button>
          </div>
        </div>,
        document.body
      )}
    </UserLayout>
  );
}
