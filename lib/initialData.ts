import { Movie, Episode, Genre, User } from './types';

// Real open-source video stream template helpers
export const SAMPLE_VIDEOS = {
  tearsOfSteel: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
  bigBuckBunny: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  sintel: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
};

export const INITIAL_GENRES: Genre[] = [
  { id: '1', name: 'សកម្មភាព (Action)', slug: 'action', count: 0 },
  { id: '2', name: 'វិទ្យាសាស្ត្រ (Sci-Fi)', slug: 'sci-fi', count: 0 },
  { id: '3', name: 'រឿងភាគ (Drama)', slug: 'drama', count: 0 },
  { id: '4', name: 'ផ្សងព្រេង (Adventure)', slug: 'adventure', count: 0 },
  { id: '5', name: 'កំប្លែង (Comedy)', slug: 'comedy', count: 0 },
  { id: '6', name: 'រំភើប (Thriller)', slug: 'thriller', count: 0 },
  { id: '7', name: 'រន្ធត់ (Horror)', slug: 'horror', count: 0 },
  { id: '8', name: 'ភាពយន្តខ្មែរ (Khmer Cinema)', slug: 'khmer-cinema', count: 0 },
];

export const GENRE_MAP: Record<string, string> = {
  'Action': 'សកម្មភាព (Action)',
  'Sci-Fi': 'វិទ្យាសាស្ត្រ (Sci-Fi)',
  'Drama': 'រឿងភាគ (Drama)',
  'Adventure': 'ផ្សងព្រេង (Adventure)',
  'Comedy': 'កំប្លែង (Comedy)',
  'Thriller': 'រំភើប (Thriller)',
  'Horror': 'រន្ធត់ (Horror)',
  'Khmer Cinema': 'ភាពយន្តខ្មែរ (Khmer Cinema)',
};

export const formatGenreName = (name: string): string => {
  return GENRE_MAP[name] || name;
};

export const isGenreMatch = (movieGenres: string[] | undefined, selectedGenre: string): boolean => {
  if (!selectedGenre || selectedGenre === 'all') return true;
  if (!movieGenres || movieGenres.length === 0) return false;
  
  const target = selectedGenre.toLowerCase().trim();
  return movieGenres.some((g) => {
    const genreStr = g.toLowerCase().trim();
    const formatted = (formatGenreName(g)).toLowerCase().trim();
    return (
      genreStr === target ||
      genreStr.includes(target) ||
      target.includes(genreStr) ||
      formatted === target ||
      formatted.includes(target) ||
      target.includes(formatted)
    );
  });
};

// Empty arrays - Only movies uploaded by Admin will exist
export const INITIAL_MOVIES: Movie[] = [];
export const INITIAL_SERIES: Movie[] = [];
export const INITIAL_EPISODES: Episode[] = [];

export const INITIAL_USERS: User[] = [
  {
    id: 'u-admin-1',
    name: 'Master Admin',
    email: 'admin@stream.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    role: 'ADMIN',
    status: 'active',
    createdAt: '2026-01-01',
    favorites: [],
    history: [],
  },
  {
    id: 'u-user-1',
    name: 'Standard User',
    email: 'user@stream.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    role: 'USER',
    status: 'active',
    createdAt: '2026-02-14',
    favorites: [],
    history: [],
  },
];
