export type Role = 'ADMIN' | 'USER';
export type UserStatus = 'active' | 'banned';

export interface SubtitleTrack {
  id: string;
  label: string;
  lang: string;
  src: string;
}

export interface Movie {
  id: string;
  title: string;
  description: string;
  posterUrl: string;
  backdropUrl: string;
  trailerUrl: string;
  videoUrl: string;
  releaseYear: number;
  rating: number; // e.g. 8.9
  duration: string; // e.g. "2h 15m" or "45m"
  type: 'movie' | 'series';
  genres: string[];
  isFeatured?: boolean;
  isTrending?: boolean;
  isPopular?: boolean;
  isLatest?: boolean;
  isPublished: boolean;
  views: number;
  subtitles: SubtitleTrack[];
  cast: string[];
  director: string;
  uploadedByUserId?: string;
  uploadedByUserName?: string;
  uploadedByAvatar?: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: string;
}

export interface Episode {
  id: string;
  seriesId: string;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  description: string;
  duration: string;
  videoUrl: string;
  thumbnailUrl: string;
  subtitles: SubtitleTrack[];
  views: number;
}

export interface Season {
  seasonNumber: number;
  title: string;
  episodesCount: number;
}

export interface Genre {
  id: string;
  name: string;
  slug: string;
  count?: number;
}

export interface WatchHistoryItem {
  id: string;
  contentId: string;
  contentType: 'movie' | 'series';
  episodeId?: string;
  watchedAt: string;
  progress: number; // percentage 0-100
  duration: number; // in seconds
  currentTime: number; // in seconds
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: Role;
  status: UserStatus;
  isVip?: boolean;
  token?: string;
  createdAt: string;
  favorites: string[]; // Content IDs
  history: WatchHistoryItem[];
}

export interface Comment {
  id: string;
  movieId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  rating: number; // 1-5
  createdAt: string;
}

export interface PlaybackProgress {
  contentId: string;
  currentTime: number;
  duration: number;
  updatedAt: string;
}

export interface DashboardStats {
  totalMovies: number;
  totalSeries: number;
  totalEpisodes: number;
  totalUsers: number;
  totalViews: number;
  recentMovies: Movie[];
  recentUsers: User[];
  monthlyViews: { month: string; views: number }[];
  dailyViews: { date: string; views: number }[];
  topMovies: { title: string; views: number; rating: number }[];
  categoryStats: { genre: string; count: number }[];
}

export interface CustomBannerItem {
  id: string;
  imageUrl: string;
  title?: string;
  subtitle?: string;
  linkUrl?: string;
}

export interface BannerSettings {
  featuredMovieId: string;
  featuredMovieIds?: string[];
  customBanners?: CustomBannerItem[];
  customHeadline?: string;
  customSubtitle?: string;
  customBannerUrl?: string;
  announcementTitle?: string;
  announcementText?: string;
  announcementDate?: string;
  announcementColor?: 'red' | 'yellow' | 'blue' | 'dark';
  showAnnouncement: boolean;
  facebookUrl?: string;
  twitterUrl?: string;
  instagramUrl?: string;
  githubUrl?: string;
  telegramUrl?: string;
  tiktokUrl?: string;
  showAppSection?: boolean;
  appSectionTitle?: string;
  appSectionSubtitle?: string;
  androidAppUrl?: string;
  iosAppUrl?: string;
  apkDownloadUrl?: string;
  siteName?: string;
  maintenanceMode?: boolean;
  defaultQuality?: string;
  maxBitrate?: string;

  // Notification Alert Settings
  enablePushNotifications?: boolean;
  enableTelegramAlerts?: boolean;
  enableSecurityAlerts?: boolean;
  enableNewEpisodeAlerts?: boolean;
  enableUserLoginAlerts?: boolean;
  requireLoginToWatch?: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'new_movie' | 'new_episode' | 'system' | 'info' | 'alert';
  targetUrl?: string;
  userId?: string;
  createdAt: string;
  read: boolean;
}
