'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useData } from '@/context/DataContext';
import { api } from '@/lib/api';
import {
  Film,
  Plus,
  Search,
  Edit3,
  Trash2,
  Star,
  CheckCircle,
  XCircle,
  Globe,
  Database,
  RefreshCw,
  ExternalLink,
  Download,
  X,
  Play,
  AlertCircle
} from 'lucide-react';

interface ApiMovie {
  id: string;
  apiName: string;
  apiUrl: string;
  apiKey?: string;
  title: string;
  posterUrl: string;
  videoUrl: string;
  releaseYear: number;
  rating: number;
  status: string;
  createdAt: string;
}

export default function AdminMoviesPage() {
  const { movies, deleteMovie, togglePublishMovie, addMovie, updateMovie } = useData();
  const [activeTab, setActiveTab] = useState<'local' | 'api'>('local');
  const [localSubTab, setLocalSubTab] = useState<'all' | 'pending' | 'published' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [previewMovie, setPreviewMovie] = useState<{ url: string; title: string } | null>(null);

  // API Movies State
  const [apiMovies, setApiMovies] = useState<ApiMovie[]>([]);
  const [isLoadingApi, setIsLoadingApi] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApiMovie, setEditingApiMovie] = useState<ApiMovie | null>(null);

  // Custom Confirm & Alert Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Rejection Modal State
  const [rejectModal, setRejectModal] = useState<{
    isOpen: boolean;
    movie: any | null;
    reason: string;
  }>({
    isOpen: false,
    movie: null,
    reason: 'វីដេអូមិនសមស្របតាមគោលការណ៍',
  });

  const showAlert = (title: string, message: string) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmText: 'យល់ព្រម',
      cancelText: '',
      onConfirm: () => setConfirmModal((prev) => ({ ...prev, isOpen: false })),
    });
  };

  // Modal Form State
  const [formData, setFormData] = useState({
    apiName: 'TMDB / Movie Provider API',
    apiUrl: 'https://api.themoviedb.org/3/movie/popular',
    apiKey: '',
    title: '',
    posterUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    releaseYear: 2024,
    rating: 8.5,
    status: 'active',
  });

  const fetchApiMovies = async () => {
    setIsLoadingApi(true);
    try {
      const data = await api.getApiMovies();
      setApiMovies(data || []);
    } catch {
      setApiMovies([]);
    } finally {
      setIsLoadingApi(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'api') {
      fetchApiMovies();
    }
  }, [activeTab]);

  const pendingCount = movies.filter((m) => m.approvalStatus === 'pending').length;
  const rejectedCount = movies.filter((m) => m.approvalStatus === 'rejected').length;

  const handleApproveMovie = async (movie: any) => {
    try {
      await updateMovie(movie.id, { isPublished: true, approvalStatus: 'approved' });
      showAlert('អនុម័តជោគជ័យ', `បានអនុម័ត និងបោះពុម្ពផ្សាយវីដេអូ «${movie.title}» ដោយជោគជ័យ!`);
      if (movie.uploadedByUserId) {
        await api.sendNotification({
          title: 'វីដេអូរបស់អ្នកត្រូវបានអនុម័ត! (Approved)',
          message: `វីដេអូ «${movie.title}» ត្រូវបាន Admin ពិនិត្យអនុម័ត និងបោះពុម្ពផ្សាយជោគជ័យ!`,
          type: 'info',
          userId: movie.uploadedByUserId,
          targetUrl: `/movie/${movie.id}`,
        });
      }
    } catch (err: any) {
      showAlert('បរាជ័យ', err.message || 'បរាជ័យក្នុងការអនុម័ត');
    }
  };

  const handleRejectMovie = (movie: any) => {
    setRejectModal({
      isOpen: true,
      movie,
      reason: 'វីដេអូមិនសមស្របតាមគោលការណ៍',
    });
  };

  const submitRejectMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModal.movie) return;
    const movie = rejectModal.movie;
    const reason = rejectModal.reason.trim();
    setRejectModal((prev) => ({ ...prev, isOpen: false }));

    try {
      await updateMovie(movie.id, { isPublished: false, approvalStatus: 'rejected', rejectionReason: reason });
      showAlert('បដិសេធជោគជ័យ', `បានបដិសេធវីដេអូ «${movie.title}» ដោយជោគជ័យ!`);
      if (movie.uploadedByUserId) {
        await api.sendNotification({
          title: 'វីដេអូរបស់អ្នកត្រូវបានបដិសេធ (Rejected)',
          message: `វីដេអូ «${movie.title}» ត្រូវបានបដិសេធដោយ Admin។ មូលហេតុ: ${reason || 'វីដេអូមិនសមស្រប'}`,
          type: 'alert',
          userId: movie.uploadedByUserId,
          targetUrl: '/profile',
        });
      }
    } catch (err: any) {
      showAlert('បរាជ័យ', err.message || 'បរាជ័យក្នុងការបដិសេធ');
    }
  };

  const handleOpenAddModal = () => {
    setEditingApiMovie(null);
    setFormData({
      apiName: 'TMDB / Custom API',
      apiUrl: 'https://api.themoviedb.org/3/movie/popular',
      apiKey: '',
      title: '',
      posterUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      releaseYear: 2024,
      rating: 8.5,
      status: 'active',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (movie: ApiMovie) => {
    setEditingApiMovie(movie);
    setFormData({
      apiName: movie.apiName,
      apiUrl: movie.apiUrl,
      apiKey: movie.apiKey || '',
      title: movie.title,
      posterUrl: movie.posterUrl,
      videoUrl: movie.videoUrl,
      releaseYear: movie.releaseYear,
      rating: movie.rating,
      status: movie.status,
    });
    setIsModalOpen(true);
  };

  const handleSaveApiMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.videoUrl.trim()) {
      showAlert('ខ្វះព័ត៌មាន', 'សូមបញ្ចូលចំណងជើង និង Video Stream URL!');
      return;
    }

    try {
      if (editingApiMovie) {
        await api.updateApiMovie(editingApiMovie.id, formData);
        showAlert('ជោគជ័យ', 'បានកែប្រែ API Movie ដោយជោគជ័យ!');
      } else {
        await api.addApiMovie(formData);
        showAlert('ជោគជ័យ', 'បានបន្ថែម API Movie ថ្មីដោយជោគជ័យ!');
      }
      setIsModalOpen(false);
      fetchApiMovies();
    } catch (err: any) {
      showAlert('បរាជ័យ', err.message || 'បរាជ័យក្នុងការរក្សាទុក');
    }
  };

  const handleDeleteApiMovie = (id: string, title: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'លុប API Movie? (Delete API Movie)',
      message: `តើអ្នកពិតជាចង់លុប API Movie "${title}" នេះមែនទេ?`,
      confirmText: 'លុប (Delete)',
      cancelText: 'បោះបង់',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          await api.deleteApiMovie(id);
          fetchApiMovies();
        } catch (err: any) {
          console.error(err);
        }
      },
    });
  };

  const handleAutoGenerateApi = async () => {
    try {
      await api.autoGenerateApiMovies();
      showAlert('ជោគជ័យ', 'បានទាញយក និងបង្កើត Movie APIs ដោយជោគជ័យ!');
      fetchApiMovies();
    } catch (err: any) {
      showAlert('បរាជ័យ', err.message || 'បរាជ័យក្នុងការបង្កើត API Movies');
    }
  };

  const handleImportToLocal = async (movie: ApiMovie) => {
    try {
      await addMovie({
        title: movie.title,
        description: `ភាពយន្តនាំចូលពី API ខាងក្រៅ (${movie.apiName})`,
        posterUrl: movie.posterUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500',
        backdropUrl: movie.posterUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800',
        trailerUrl: '',
        videoUrl: movie.videoUrl,
        releaseYear: movie.releaseYear || 2024,
        rating: movie.rating || 8.0,
        duration: '1h 50m',
        type: 'movie',
        genres: ['Action', 'API Imported'],
        isFeatured: true,
        isTrending: true,
        isPopular: true,
        isLatest: true,
        isPublished: true,
        cast: [],
        director: 'API Provider',
        subtitles: []
      });
      showAlert('ជោគជ័យ', `បាននាំចូលភាពយន្ត "${movie.title}" ទៅក្នុងកាតាឡុកក្នុងស្រុកដោយជោគជ័យ!`);
    } catch (err: any) {
      showAlert('បរាជ័យ', err.message || 'បរាជ័យក្នុងការនាំចូល');
    }
  };

  const filteredLocalMovies = movies.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.genres.some((g) => g.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (m.uploadedByUserName && m.uploadedByUserName.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (localSubTab === 'pending') {
      return m.approvalStatus === 'pending';
    } else if (localSubTab === 'published') {
      return m.isPublished && m.approvalStatus !== 'rejected' && m.approvalStatus !== 'pending';
    } else if (localSubTab === 'rejected') {
      return m.approvalStatus === 'rejected';
    }
    return true;
  });

  const filteredApiMovies = apiMovies.filter(
    (m) =>
      m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.apiName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center space-x-3">
              <Film className="w-7 h-7 text-brand-red" />
              <span>គ្រប់គ្រងភាពយន្ត (Movie Management)</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              គ្រប់គ្រងភាពយន្តក្នុងស្រុក វីដេអូស្នើសុំពី User និង ភាពយន្ត External APIs។
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {activeTab === 'local' ? (
              <Link
                href="/admin/movies/add"
                className="px-5 py-2.5 bg-brand-red hover:bg-brand-crimson text-white font-bold rounded-2xl text-xs flex items-center space-x-2 shadow-md shadow-brand-red/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>បញ្ចូលភាពយន្តក្នុងស្រុកថ្មី</span>
              </Link>
            ) : (
              <button
                onClick={handleOpenAddModal}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-2xl text-xs flex items-center space-x-2 shadow-md shadow-amber-500/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>បញ្ចូល API Movie ថ្មី</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Switcher & Search Bar */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Tab Pills */}
            <div className="flex flex-wrap items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 gap-1">
              <button
                onClick={() => setActiveTab('local')}
                className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-extrabold text-xs transition-all ${
                  activeTab === 'local'
                    ? 'bg-brand-red text-white shadow-md shadow-brand-red/30'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Database className="w-4 h-4" />
                <span>ភាពយន្តក្នុងស្រុក ({movies.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('api')}
                className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-extrabold text-xs transition-all ${
                  activeTab === 'api'
                    ? 'bg-brand-red text-white shadow-md shadow-brand-red/30'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>ភាពយន្ត API ខាងក្រៅ ({apiMovies.length})</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full max-w-xs">
              <input
                type="text"
                placeholder={activeTab === 'local' ? "ស្វែងរកចំណងជើង ឬអ្នកអាប់ឡូត..." : "ស្វែងរក API Provider..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 text-xs text-slate-900 placeholder-slate-400 rounded-xl py-2.5 pl-9 pr-4 border border-slate-200 focus:outline-none focus:border-brand-red focus:bg-white"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          {/* Sub-filter for Local Movies (All / Pending Submissions / Published / Rejected) */}
          {activeTab === 'local' && (
            <div className="flex items-center space-x-2 pt-2 border-t border-slate-100 text-xs flex-wrap gap-y-2">
              <span className="font-bold text-slate-500 mr-2">តម្រងតាមស្ថានភាព:</span>
              <button
                onClick={() => setLocalSubTab('all')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  localSubTab === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                ទាំងអស់ ({movies.length})
              </button>
              <button
                onClick={() => setLocalSubTab('pending')}
                className={`px-3 py-1.5 rounded-xl font-bold flex items-center space-x-1.5 transition-all ${
                  localSubTab === 'pending'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                <span>រង់ចាំការអនុម័ត (Pending)</span>
                {pendingCount > 0 && (
                  <span className="bg-red-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full animate-pulse">
                    {pendingCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setLocalSubTab('published')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  localSubTab === 'published'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                បានបោះពុម្ព (Published)
              </button>
              <button
                onClick={() => setLocalSubTab('rejected')}
                className={`px-3 py-1.5 rounded-xl font-bold flex items-center space-x-1.5 transition-all ${
                  localSubTab === 'rejected'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-red-50 text-red-800 border border-red-200 hover:bg-red-100'
                }`}
              >
                <span>បានបដិសេធ (Rejected)</span>
                {rejectedCount > 0 && (
                  <span className="bg-red-800 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                    {rejectedCount}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* TAB 1: LOCAL MOVIES TABLE & MOBILE CARDS */}
        {activeTab === 'local' && (
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-mono border-b border-slate-200">
                  <tr>
                    <th className="p-4">ភាពយន្ត</th>
                    <th className="p-4">អ្នកអាប់ឡូត &amp; ថ្ងៃខែ</th>
                    <th className="p-4">ប្រភេទ (Genre)</th>
                    <th className="p-4">ពិន្ទុ</th>
                    <th className="p-4">ស្ថានភាព</th>
                    <th className="p-4 text-right">អនុម័ត / សកម្មភាព</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLocalMovies.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                        មិនមានទិន្នន័យភាពយន្តនៅក្នុងផ្នែកនេះទេ
                      </td>
                    </tr>
                  ) : (
                    filteredLocalMovies.map((movie) => {
                      const isPending = movie.approvalStatus === 'pending';
                      const isRejected = movie.approvalStatus === 'rejected';
                      return (
                        <tr key={movie.id} className={`hover:bg-slate-50 transition-colors ${isPending ? 'bg-amber-50/40' : isRejected ? 'bg-red-50/20' : ''}`}>
                          <td className="p-4 flex items-center space-x-3">
                            <img
                              src={movie.posterUrl}
                              alt={movie.title}
                              className="w-10 h-14 object-cover rounded-lg shadow-sm"
                            />
                            <div>
                              <p className="font-bold text-slate-900 text-sm line-clamp-1">{movie.title}</p>
                              <p className="text-[10px] text-slate-500 font-medium truncate max-w-xs">{movie.releaseYear} • {movie.duration}</p>
                            </div>
                          </td>

                          {/* Uploader & Auto Date Display */}
                          <td className="p-4">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                {movie.uploadedByAvatar ? (
                                  <img
                                    src={movie.uploadedByAvatar}
                                    alt={movie.uploadedByUserName || 'Uploader'}
                                    className="w-5 h-5 rounded-full object-cover border border-amber-400"
                                  />
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold text-[9px] flex items-center justify-center">
                                    {(movie.uploadedByUserName || 'A')[0].toUpperCase()}
                                  </div>
                                )}
                                <span className="font-bold text-slate-800 text-xs">
                                  {movie.uploadedByUserName || 'Master Admin'}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 font-mono">
                                ថ្ងៃអាប់ឡូត: {movie.createdAt ? new Date(movie.createdAt).toLocaleDateString('km-KH', { year: 'numeric', month: 'short', day: 'numeric' }) : 'មិនមាន'}
                              </p>
                            </div>
                          </td>

                          {/* Genres */}
                          <td className="p-4">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {movie.genres.map((g) => (
                                <span key={g} className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-md text-[10px]">
                                  {g}
                                </span>
                              ))}
                            </div>
                          </td>

                          {/* Rating & Views */}
                          <td className="p-4">
                            <div className="space-y-1">
                              <span className="flex items-center space-x-1 text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 w-fit">
                                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                <span>{movie.rating}</span>
                              </span>
                              <p className="text-[10px] text-slate-400 font-mono">{movie.views.toLocaleString()} views</p>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="p-4">
                            <button
                              onClick={() => togglePublishMovie(movie.id)}
                              className={`px-3 py-1 rounded-full text-[10px] font-bold border flex items-center space-x-1.5 transition-all ${
                                isRejected
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : isPending
                                  ? 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              {isRejected ? (
                                <XCircle className="w-3 h-3 text-red-600" />
                              ) : isPending ? (
                                <AlertCircle className="w-3 h-3 text-amber-600" />
                              ) : (
                                <CheckCircle className="w-3 h-3 text-emerald-600" />
                              )}
                              <span>
                                {isRejected ? 'បានបដិសេធ' : isPending ? 'រង់ចាំអនុម័ត (Pending)' : 'បានបោះពុម្ព'}
                              </span>
                            </button>
                          </td>

                          {/* Actions: Approve / Preview / Edit / Delete */}
                          <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              onClick={() => setPreviewMovie({ url: movie.videoUrl, title: movie.title })}
                              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-[11px] shadow-xs inline-flex items-center space-x-1 transition-all"
                              title="មើលវីដេអូ (Watch Video)"
                            >
                              <Play className="w-3.5 h-3.5 fill-white" />
                              <span>មើលវីដេអូ</span>
                            </button>

                            {(isPending || isRejected) && (
                              <button
                                onClick={() => handleApproveMovie(movie)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] shadow-xs inline-flex items-center space-x-1 transition-all"
                                title="អនុម័ត (Approve)"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>អនុម័ត</span>
                              </button>
                            )}

                            {isPending && (
                              <button
                                onClick={() => handleRejectMovie(movie)}
                                className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-[11px] shadow-xs inline-flex items-center space-x-1 transition-all"
                                title="បដិសេធ (Reject)"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>បដិសេធ</span>
                              </button>
                            )}

                            <Link
                              href={`/admin/movies/edit/${movie.id}`}
                              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-blue-600 inline-flex items-center"
                              title="កែប្រែ / Edit"
                            >
                              <Edit3 className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => {
                                setConfirmModal({
                                  isOpen: true,
                                  title: 'លុបភាពយន្ត? (Delete Movie)',
                                  message: `តើអ្នកពិតជាចង់លុបភាពយន្ត "${movie.title}" នេះមែនទេ?`,
                                  confirmText: 'លុប (Delete)',
                                  cancelText: 'បោះបង់',
                                  onConfirm: async () => {
                                    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                                    try {
                                      await deleteMovie(movie.id);
                                      showAlert('ជោគជ័យ', `បានលុបភាពយន្ត «${movie.title}» ដោយជោគជ័យ!`);
                                    } catch (err: any) {
                                      showAlert('បរាជ័យ', err.message || 'បរាជ័យក្នុងការលុបភាពយន្ត');
                                    }
                                  },
                                });
                              }}
                              className="p-2 rounded-xl bg-slate-100 hover:bg-red-50 text-red-600 inline-flex items-center"
                              title="លុប / Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View (< md) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredLocalMovies.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-medium text-xs">
                  មិនមានទិន្នន័យភាពយន្តនៅក្នុងផ្នែកនេះទេ
                </div>
              ) : (
                filteredLocalMovies.map((movie) => {
                  const isPending = movie.approvalStatus === 'pending';
                  const isRejected = movie.approvalStatus === 'rejected';
                  return (
                    <div key={movie.id} className={`p-4 space-y-3 ${isPending ? 'bg-amber-50/40' : isRejected ? 'bg-red-50/20' : 'bg-white'}`}>
                      {/* Top Header: Poster + Title + Status Pill */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <img
                            src={movie.posterUrl}
                            alt={movie.title}
                            className="w-12 h-16 object-cover rounded-xl shadow-sm flex-shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-slate-900 text-sm leading-snug break-words">{movie.title}</h4>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">{movie.releaseYear} • {movie.duration}</p>
                            <div className="flex items-center space-x-1 text-amber-700 font-bold text-[11px] mt-1">
                              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                              <span>{movie.rating}</span>
                              <span className="text-slate-400 font-mono font-normal ml-1">({movie.views.toLocaleString()} views)</span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => togglePublishMovie(movie.id)}
                          className={`px-2.5 py-1 rounded-full text-[9px] font-bold border flex items-center space-x-1 flex-shrink-0 ${
                            isRejected
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : isPending
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {isRejected ? (
                            <XCircle className="w-3 h-3 text-red-600" />
                          ) : isPending ? (
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                          ) : (
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                          )}
                          <span>{isRejected ? 'បានបដិសេធ' : isPending ? 'Pending' : 'បានបោះពុម្ព'}</span>
                        </button>
                      </div>

                      {/* Uploader & Genres Info */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                        <div className="flex items-center space-x-2">
                          {movie.uploadedByAvatar ? (
                            <img src={movie.uploadedByAvatar} alt="" className="w-5 h-5 rounded-full object-cover border border-amber-400" />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold text-[9px] flex items-center justify-center">
                              {(movie.uploadedByUserName || 'A')[0].toUpperCase()}
                            </div>
                          )}
                          <span className="font-bold text-slate-800 text-xs">{movie.uploadedByUserName || 'Master Admin'}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            • {movie.createdAt ? new Date(movie.createdAt).toLocaleDateString('km-KH', { year: 'numeric', month: 'short', day: 'numeric' }) : ''}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {movie.genres.map((g) => (
                            <span key={g} className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-md text-[10px]">
                              {g}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Bottom Actions Bar */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 flex-wrap">
                        <div className="flex items-center space-x-1.5 flex-wrap">
                          <button
                            onClick={() => setPreviewMovie({ url: movie.videoUrl, title: movie.title })}
                            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-[11px] shadow-xs inline-flex items-center space-x-1"
                          >
                            <Play className="w-3.5 h-3.5 fill-white" />
                            <span>មើលវីដេអូ</span>
                          </button>

                          {(isPending || isRejected) && (
                            <button
                              onClick={() => handleApproveMovie(movie)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] shadow-xs inline-flex items-center space-x-1"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>អនុម័ត</span>
                            </button>
                          )}
                          {isPending && (
                            <button
                              onClick={() => handleRejectMovie(movie)}
                              className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-[11px] shadow-xs inline-flex items-center space-x-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>បដិសេធ</span>
                            </button>
                          )}
                        </div>

                        <div className="flex items-center space-x-1.5 flex-shrink-0">
                          <Link
                            href={`/admin/movies/edit/${movie.id}`}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-blue-600 inline-flex items-center"
                            title="កែប្រែ / Edit"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => {
                              setConfirmModal({
                                isOpen: true,
                                title: 'លុបភាពយន្ត? (Delete Movie)',
                                message: `តើអ្នកពិតជាចង់លុបភាពយន្ត "${movie.title}" នេះមែនទេ?`,
                                confirmText: 'លុប (Delete)',
                                cancelText: 'បោះបង់',
                                onConfirm: async () => {
                                  setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                                  try {
                                    await deleteMovie(movie.id);
                                    showAlert('ជោគជ័យ', `បានលុបភាពយន្ត «${movie.title}» ដោយជោគជ័យ!`);
                                  } catch (err: any) {
                                    showAlert('បរាជ័យ', err.message || 'បរាជ័យក្នុងការលុបភាពយន្ត');
                                  }
                                },
                              });
                            }}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-red-50 text-red-600 inline-flex items-center"
                            title="លុប / Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: EXTERNAL API MOVIES TABLE */}
        {activeTab === 'api' && (
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm space-y-4">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4 text-brand-red" />
                <span className="text-xs font-extrabold text-slate-800 uppercase">
                  បញ្ជី Movie API Sources ({filteredApiMovies.length})
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleAutoGenerateApi}
                  className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl transition text-xs font-extrabold flex items-center space-x-1 shadow-sm"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>ទាញយក API ស្វ័យប្រវត្ត (Auto Fetch API)</span>
                </button>

                <button
                  onClick={fetchApiMovies}
                  className="p-2 text-slate-500 hover:text-slate-800 bg-white rounded-xl border border-slate-200 transition text-xs font-bold flex items-center space-x-1"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingApi ? 'animate-spin' : ''}`} />
                  <span>Refresh API</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-mono border-b border-slate-200">
                  <tr>
                    <th className="p-4">API Provider</th>
                    <th className="p-4">ចំណងជើងភាពយន្ត API</th>
                    <th className="p-4">Video Stream URL</th>
                    <th className="p-4">ឆ្នាំ និងពិន្ទុ</th>
                    <th className="p-4">ស្ថានភាព</th>
                    <th className="p-4 text-right">សកម្មភាព</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredApiMovies.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        មិនទាន់មាន Movie API Sources នៅឡើយទេ។ ចុចប៊ូតុង <b>"បញ្ចូល API Movie ថ្មី"</b> ដើម្បីបន្ថែម!
                      </td>
                    </tr>
                  ) : (
                    filteredApiMovies.map((movie) => (
                      <tr key={movie.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-bold text-slate-800">
                          <span className="bg-amber-500/10 text-amber-700 px-2.5 py-1 rounded-lg border border-amber-300/40 text-[11px]">
                            {movie.apiName}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            {movie.posterUrl && (
                              <img src={movie.posterUrl} alt={movie.title} className="w-9 h-12 object-cover rounded-lg border border-slate-200" />
                            )}
                            <div>
                              <p className="font-extrabold text-slate-900 text-xs">{movie.title}</p>
                              <span className="text-[10px] text-slate-400 font-mono">ID: {movie.id}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 max-w-xs">
                          <a
                            href={movie.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-mono text-blue-600 hover:underline truncate block flex items-center space-x-1"
                          >
                            <span className="truncate">{movie.videoUrl}</span>
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                        </td>
                        <td className="p-4">
                          <span className="font-bold text-slate-700">{movie.releaseYear}</span> •{' '}
                          <span className="text-amber-600 font-bold">★ {movie.rating}</span>
                        </td>
                        <td className="p-4">
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                            {movie.status}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-1.5">
                          <button
                            onClick={() => handleImportToLocal(movie)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold shadow-sm inline-flex items-center space-x-1 transition"
                            title="Import to Local Catalog"
                          >
                            <Download className="w-3 h-3" />
                            <span>Import</span>
                          </button>

                          <button
                            onClick={() => handleOpenEditModal(movie)}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-blue-600 inline-flex items-center"
                            title="Edit API Movie"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteApiMovie(movie.id, movie.title)}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-red-50 text-red-600 inline-flex items-center"
                            title="Delete API Movie"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ADD / EDIT API MOVIE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-fade-in text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center space-x-2">
                <Globe className="w-4 h-4 text-brand-red" />
                <span>{editingApiMovie ? 'កែប្រែ API Movie' : 'បញ្ចូល API Movie ថ្មី'}</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveApiMovie} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">ឈ្មោះ API Provider:</label>
                <input
                  type="text"
                  value={formData.apiName}
                  onChange={(e) => setFormData({ ...formData, apiName: e.target.value })}
                  placeholder="ឧទាហរណ៍: TMDB API, Custom Movie Provider"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-brand-red font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">ចំណងជើងភាពយន្ត (Movie Title):</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="បញ្ចូលចំណងជើងភាពយន្ត..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-brand-red font-medium"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Video Stream / Embed URL:</label>
                <input
                  type="text"
                  value={formData.videoUrl}
                  onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                  placeholder="https://.../video.mp4"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-brand-red font-mono"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Poster Image URL:</label>
                <input
                  type="text"
                  value={formData.posterUrl}
                  onChange={(e) => setFormData({ ...formData, posterUrl: e.target.value })}
                  placeholder="https://.../poster.jpg"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-brand-red font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">ឆ្នាំចេញផ្សាយ (Year):</label>
                  <input
                    type="number"
                    value={formData.releaseYear}
                    onChange={(e) => setFormData({ ...formData, releaseYear: parseInt(e.target.value) || 2024 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-brand-red font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">ពិន្ទុ (Rating):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.rating}
                    onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) || 8.0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-brand-red font-bold"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-red hover:bg-red-700 text-white font-bold rounded-xl shadow-md shadow-brand-red/20"
                >
                  រក្សាទុក
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Video Preview Modal for Admin */}
      {previewMovie && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-4xl bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 text-white">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center space-x-2.5">
                <Film className="w-5 h-5 text-brand-red" />
                <h3 className="text-sm font-extrabold truncate">មើលវីដេអូ: {previewMovie.title}</h3>
              </div>
              <button
                onClick={() => setPreviewMovie(null)}
                className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-black flex justify-center">
              <video
                src={previewMovie.url}
                controls
                autoPlay
                className="w-full max-h-[75vh] rounded-2xl border border-slate-800 shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}
      {/* CUSTOM REJECT REASON MODAL PORTAL */}
      {rejectModal.isOpen && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-sm sm:max-w-md w-full text-left space-y-4 shadow-2xl text-white">
            <div className="flex items-center space-x-3 text-red-400">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-base font-black uppercase text-white">បដិសេធភាពយន្ត (Reject Movie)</h3>
            </div>
            <p className="text-xs text-slate-300">
              សូមបញ្ចូលមូលហេតុនៃការបដិសេធភាពយន្ត «<span className="font-bold text-white">{rejectModal.movie?.title}</span>»
            </p>
            <form onSubmit={submitRejectMovie} className="space-y-4">
              <input
                type="text"
                required
                value={rejectModal.reason}
                onChange={(e) => setRejectModal((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder="មូលហេតុ..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-xs font-bold text-white focus:outline-none focus:border-brand-red"
              />
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold rounded-xl shadow-lg"
                >
                  បដិសេធ (Reject)
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* CUSTOM CONFIRMATION & ALERT MODAL PORTAL */}
      {confirmModal.isOpen && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-sm sm:max-w-md w-full text-center space-y-5 shadow-2xl text-white transform transition-all animate-scale-in">
            <div className="relative inline-block">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto border bg-red-500/10 border-red-500/30 text-red-500">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-white">{confirmModal.title}</h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 font-medium leading-relaxed">
                {confirmModal.message}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              {confirmModal.cancelText ? (
                <button
                  type="button"
                  onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                  className="flex-1 py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm transition cursor-pointer border border-slate-700"
                >
                  {confirmModal.cancelText}
                </button>
              ) : null}
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className="flex-1 py-3 px-4 rounded-2xl text-white font-bold text-xs sm:text-sm transition shadow-lg cursor-pointer bg-red-600 hover:bg-red-700 shadow-red-600/30"
              >
                {confirmModal.confirmText || 'យល់ព្រម'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </AdminLayout>
  );
}
