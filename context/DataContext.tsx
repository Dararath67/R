'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Movie, Episode, Genre, User, DashboardStats, BannerSettings } from '@/lib/types';
import { INITIAL_GENRES } from '@/lib/initialData';
import { api } from '@/lib/api';

interface DataContextType {
  movies: Movie[];
  series: Movie[];
  episodes: Episode[];
  genres: Genre[];
  users: User[];
  bannerSettings: BannerSettings;
  updateBannerSettings: (newSettings: Partial<BannerSettings>) => void;
  isLoaded: boolean;
  isBannerReady: boolean;
  refreshData: () => Promise<void>;
  fetchUsers: () => Promise<void>;
  // Movie Actions
  addMovie: (movieData: Omit<Movie, 'id' | 'createdAt' | 'views'>) => Promise<void>;
  updateMovie: (id: string, movieData: Partial<Movie>) => Promise<void>;
  deleteMovie: (id: string) => Promise<void>;
  togglePublishMovie: (id: string) => Promise<void>;
  incrementViews: (id: string) => Promise<void>;
  // Episode Actions
  addEpisode: (episodeData: Omit<Episode, 'id' | 'views'>) => Promise<void>;
  deleteEpisode: (id: string) => Promise<void>;
  // User Actions
  toggleBanUser: (userId: string) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  // Genre Actions
  addGenre: (name: string) => Promise<void>;
  deleteGenre: (id: string) => Promise<void>;
  // Dashboard Analytics
  getDashboardStats: () => DashboardStats;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const BANNER_SETTINGS_KEY = 'movie_app_banner_settings';

const DEFAULT_BANNER_SETTINGS: BannerSettings = {
  featuredMovieId: '',
  featuredMovieIds: [],
  customBanners: [],
  customHeadline: '',
  customSubtitle: '',
  customBannerUrl: '',
  announcementTitle: '',
  announcementText: '',
  announcementDate: '',
  announcementColor: 'red',
  showAnnouncement: false,
  facebookUrl: 'https://facebook.com',
  twitterUrl: 'https://twitter.com',
  instagramUrl: 'https://instagram.com',
  githubUrl: 'https://github.com',
  tiktokUrl: 'https://tiktok.com',
  telegramUrl: 'https://t.me',
  showAppSection: true,
  appSectionTitle: 'ទាញយកកម្មវិធី TERK TLA Mobile App',
  appSectionSubtitle: 'ទស្សនាភាពយន្ត និងរឿងភាគល្បីៗលើទូរស័ព្ទដៃ Android & iOS គ្រប់ពេលវេលា គុណភាព 4K Ultra HD',
  androidAppUrl: 'https://play.google.com',
  iosAppUrl: 'https://apple.com/app-store',
  apkDownloadUrl: 'https://terktla.app/download.apk',
  siteName: 'TERK TLA',
  maintenanceMode: false,
  defaultQuality: '4K',
  maxBitrate: '12000 kbps',
  enablePushNotifications: true,
  enableTelegramAlerts: true,
  enableSecurityAlerts: true,
  enableNewEpisodeAlerts: true,
  enableUserLoginAlerts: false,
  requireLoginToWatch: true,
};

const MOVIES_CACHE_KEY = 'movie_app_cached_movies';
const SERIES_CACHE_KEY = 'movie_app_cached_series';
const GENRES_CACHE_KEY = 'movie_app_cached_genres';

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [series, setSeries] = useState<Movie[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [bannerSettings, setBannerSettings] = useState<BannerSettings>(DEFAULT_BANNER_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isBannerReady, setIsBannerReady] = useState(false);

  const updateBannerSettings = (newSettings: Partial<BannerSettings>) => {
    setBannerSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem(BANNER_SETTINGS_KEY, JSON.stringify(updated));
      api.updateBannerSettings(updated).catch(console.error);
      return updated;
    });
  };

  const fetchUsers = async () => {
    try {
      const fetched = await api.getUsers();
      if (fetched) setUsers(fetched);
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  const refreshData = async () => {
    try {
      const [fetchedMovies, fetchedSeries, fetchedEpisodes, fetchedGenres, fetchedBanner] =
        await Promise.all([
          api.getMovies(),
          api.getSeries(),
          api.getEpisodes(),
          api.getGenres(),
          api.getBannerSettings(),
        ]);

      if (fetchedMovies) {
        setMovies(fetchedMovies);
        localStorage.setItem(MOVIES_CACHE_KEY, JSON.stringify(fetchedMovies));
      }
      if (fetchedSeries) {
        setSeries(fetchedSeries);
        localStorage.setItem(SERIES_CACHE_KEY, JSON.stringify(fetchedSeries));
      }
      setEpisodes(fetchedEpisodes || []);
      if (Array.isArray(fetchedGenres)) {
        setGenres(fetchedGenres);
        localStorage.setItem(GENRES_CACHE_KEY, JSON.stringify(fetchedGenres));
      }
      if (fetchedBanner) {
        setBannerSettings(fetchedBanner);
        localStorage.setItem(BANNER_SETTINGS_KEY, JSON.stringify(fetchedBanner));
      }
    } catch (err) {
      console.error('Failed to load data from FastAPI backend', err);
    } finally {
      setIsLoaded(true);
      setIsBannerReady(true);
    }
  };

  useEffect(() => {
    let hasLocalData = false;
    try {
      const savedMovies = localStorage.getItem(MOVIES_CACHE_KEY);
      if (savedMovies) {
        setMovies(JSON.parse(savedMovies));
        hasLocalData = true;
      }
    } catch {}
    try {
      const savedSeries = localStorage.getItem(SERIES_CACHE_KEY);
      if (savedSeries) {
        setSeries(JSON.parse(savedSeries));
        hasLocalData = true;
      }
    } catch {}
    try {
      const savedGenres = localStorage.getItem(GENRES_CACHE_KEY);
      if (savedGenres) {
        setGenres(JSON.parse(savedGenres));
        hasLocalData = true;
      }
    } catch {}
    try {
      const savedBanner = localStorage.getItem(BANNER_SETTINGS_KEY);
      if (savedBanner) {
        setBannerSettings(JSON.parse(savedBanner));
        hasLocalData = true;
      }
    } catch (e) {
      console.error('Failed to parse banner settings', e);
    } finally {
      if (hasLocalData) {
        setIsBannerReady(true);
        setIsLoaded(true);
      }
    }

    refreshData();
    const interval = setInterval(refreshData, 30000); // Efficient background sync every 30s
    return () => clearInterval(interval);
  }, []);

  // Movie Actions
  const addMovie = async (movieData: Omit<Movie, 'id' | 'createdAt' | 'views'>) => {
    const tempId = (movieData.type === 'movie' ? 'm' : 's') + Date.now();
    const tempMovie: Movie = {
      id: tempId,
      ...movieData,
      views: 0,
      subtitles: [
        { id: 's1', label: 'English', lang: 'en', src: '' },
        { id: 's2', label: 'Khmer', lang: 'km', src: '' },
      ],
      createdAt: new Date().toISOString().split('T')[0],
    };
    setMovies((prev) => [tempMovie, ...prev]);
    const created = await api.addMovie(movieData);
    try {
      await api.sendNotification({
        title: movieData.type === 'series' ? 'រឿងភាគថ្មីបានបញ្ចូល!' : 'ភាពយន្តថ្មីបានបញ្ចូល!',
        message: `${movieData.title} (${movieData.releaseYear}) ត្រូវបានបោះពុម្ពផ្សាយជូនទស្សនាហើយ!`,
        type: 'new_movie',
        targetUrl: created?.id ? (movieData.type === 'series' ? `/series` : `/movie/${created.id}`) : '/',
      });
    } catch (e) {
      console.error('Failed auto notif:', e);
    }
    refreshData();
  };

  const updateMovie = async (id: string, movieData: Partial<Movie>) => {
    // Optimistic local state update
    setMovies((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...movieData } : m))
    );

    if (movieData.isFeatured === false && bannerSettings.featuredMovieId === id) {
      updateBannerSettings({ featuredMovieId: '' });
    } else if (movieData.isFeatured === true) {
      updateBannerSettings({ featuredMovieId: id });
    }

    await api.updateMovie(id, movieData);
    refreshData();
  };

  const deleteMovie = async (id: string) => {
    // Optimistic local deletion
    setMovies((prev) => {
      const updated = prev.filter((m) => m.id !== id);
      localStorage.setItem(MOVIES_CACHE_KEY, JSON.stringify(updated));
      return updated;
    });

    if (bannerSettings.featuredMovieId === id) {
      updateBannerSettings({ featuredMovieId: '' });
    }

    await api.deleteMovie(id);
    refreshData();
  };

  const togglePublishMovie = async (id: string) => {
    setMovies((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isPublished: !m.isPublished } : m))
    );
    await api.togglePublish(id);
    refreshData();
  };

  const incrementViews = async (id: string) => {
    setMovies((prev) =>
      prev.map((m) => (m.id === id ? { ...m, views: m.views + 1 } : m))
    );
    await api.incrementViews(id);
    refreshData();
  };

  // Episode Actions
  const addEpisode = async (episodeData: Omit<Episode, 'id' | 'views'>) => {
    await api.addEpisode(episodeData);
    await refreshData();
  };

  const deleteEpisode = async (id: string) => {
    await api.deleteEpisode(id);
    await refreshData();
  };

  // User Actions
  const toggleBanUser = async (userId: string) => {
    try {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, status: u.status === 'banned' ? 'active' : 'banned' }
            : u
        )
      );
      await api.toggleBanUser(userId);
      await refreshData();
    } catch (err: any) {
      await refreshData();
    }
  };

  const deleteUser = async (userId: string) => {
    await api.deleteUser(userId);
    await refreshData();
  };

  // Genre Actions
  const addGenre = async (name: string) => {
    await api.addGenre(name);
    await refreshData();
  };

  const deleteGenre = async (id: string) => {
    setGenres((prev) => {
      const updated = prev.filter((g) => g.id !== id && g.name !== id && g.slug !== id);
      localStorage.setItem(GENRES_CACHE_KEY, JSON.stringify(updated));
      return updated;
    });
    try {
      await api.deleteGenre(id);
    } catch (e) {
      console.warn('deleteGenre API call warning:', e);
    }
    await refreshData();
  };

  const getDashboardStats = (): DashboardStats => {
    const totalMoviesCount = movies.length;
    const totalSeriesCount = series.length;
    const totalEpisodesCount = episodes.length;
    const totalUsersCount = users.length;

    const movieViews = movies.reduce((acc, m) => acc + m.views, 0);
    const seriesViews = series.reduce((acc, s) => acc + s.views, 0);
    const totalViews = movieViews + seriesViews;

    const recentMovies = [...movies, ...series]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    const recentUsers = [...users]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    const monthlyViews = [
      { month: 'Apr', views: 0 },
      { month: 'May', views: 0 },
      { month: 'Jun', views: 0 },
      { month: 'Jul', views: 0 },
      { month: 'Aug', views: 0 },
      { month: 'Sep', views: totalViews },
    ];

    const categoryMap: Record<string, number> = {};
    [...movies, ...series].forEach((item) => {
      item.genres.forEach((g) => {
        categoryMap[g] = (categoryMap[g] || 0) + 1;
      });
    });

    const categoryStats = Object.keys(categoryMap).map((genre) => ({
      genre,
      count: categoryMap[genre],
    }));

    const topMovies = [...movies, ...series]
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 5)
      .map((m) => ({ title: m.title, views: m.views || 0, rating: m.rating || 5 }));

    const dailyViews = [
      { date: 'Mon', views: Math.round(totalViews * 0.1) },
      { date: 'Tue', views: Math.round(totalViews * 0.12) },
      { date: 'Wed', views: Math.round(totalViews * 0.15) },
      { date: 'Thu', views: Math.round(totalViews * 0.18) },
      { date: 'Fri', views: Math.round(totalViews * 0.22) },
      { date: 'Sat', views: Math.round(totalViews * 0.3) },
      { date: 'Sun', views: Math.round(totalViews * 0.25) },
    ];

    return {
      totalMovies: totalMoviesCount,
      totalSeries: totalSeriesCount,
      totalEpisodes: totalEpisodesCount,
      totalUsers: totalUsersCount,
      totalViews,
      recentMovies,
      recentUsers,
      monthlyViews,
      dailyViews,
      topMovies,
      categoryStats,
    };
  };

  return (
    <DataContext.Provider
      value={{
        movies,
        series,
        episodes,
        genres,
        users,
        bannerSettings,
        updateBannerSettings,
        isLoaded,
        isBannerReady,
        refreshData,
        fetchUsers,
        addMovie,
        updateMovie,
        deleteMovie,
        togglePublishMovie,
        incrementViews,
        addEpisode,
        deleteEpisode,
        toggleBanUser,
        deleteUser,
        addGenre,
        deleteGenre,
        getDashboardStats,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
