'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useData } from '@/context/DataContext';
import { Tv, Plus, Trash2, ListVideo } from 'lucide-react';
import { SAMPLE_VIDEOS } from '@/lib/initialData';

export default function AdminSeriesPage() {
  const { series, addMovie, deleteMovie, episodes } = useData();
  const [showAddModal, setShowAddModal] = useState(false);

  // Custom Confirm Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [releaseYear, setReleaseYear] = useState(2024);
  const [rating, setRating] = useState(9.0);
  const [posterUrl, setPosterUrl] = useState(
    'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80'
  );

  const handleCreateSeries = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    addMovie({
      title,
      description,
      posterUrl,
      backdropUrl: posterUrl,
      trailerUrl: SAMPLE_VIDEOS.tearsOfSteel,
      videoUrl: SAMPLE_VIDEOS.tearsOfSteel,
      releaseYear,
      rating,
      duration: '1 Season',
      type: 'series',
      genres: ['Drama', 'Action'],
      cast: ['Actor A', 'Actor B'],
      director: 'Director Name',
      isPublished: true,
      subtitles: [{ id: 's1', label: 'English', lang: 'en', src: '' }],
    });

    setTitle('');
    setDescription('');
    setShowAddModal(false);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center space-x-3">
              <Tv className="w-7 h-7 text-purple-600" />
              <span>Real Series & Season Management</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Create TV Series, manage seasons, and link streaming episodes.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 bg-brand-red hover:bg-brand-crimson text-white font-bold rounded-2xl text-xs flex items-center space-x-2 shadow-md shadow-brand-red/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Series</span>
          </button>
        </div>

        {/* Series Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {series.map((s) => {
            const seriesEps = episodes.filter((ep) => ep.seriesId === s.id);
            return (
              <div
                key={s.id}
                className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div className="flex space-x-4">
                  <img
                    src={s.posterUrl}
                    alt={s.title}
                    className="w-20 h-28 object-cover rounded-2xl shadow-sm flex-shrink-0"
                  />
                  <div className="space-y-1 min-w-0 flex-grow">
                    <h3 className="text-base font-bold text-slate-900 line-clamp-1">{s.title}</h3>
                    <p className="text-xs text-slate-500 font-medium line-clamp-2">{s.description}</p>
                    <div className="flex items-center space-x-2 text-[10px] pt-1">
                      <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-bold border border-purple-200">
                        {s.releaseYear}
                      </span>
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 flex items-center space-x-1 font-bold">
                        <ListVideo className="w-3 h-3 text-brand-red" />
                        <span>{seriesEps.length} Episodes</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">
                    Views: {s.views.toLocaleString()}
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          title: 'លុបស៊េរីភាពយន្ត? (Delete Series)',
                          message: `តើអ្នកពិតជាចង់លុបស៊េរីភាពយន្ត "${s.title}" នេះមែនទេ?`,
                          onConfirm: () => {
                            deleteMovie(s.id);
                            setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                          },
                        });
                      }}
                      className="p-2 rounded-xl bg-slate-100 text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Create Series */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-2xl">
              <h3 className="text-lg font-bold text-slate-900">Create New TV Series</h3>
              <form onSubmit={handleCreateSeries} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Series Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Synopsis</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Poster Image URL</label>
                  <input
                    type="url"
                    value={posterUrl}
                    onChange={(e) => setPosterUrl(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5"
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-brand-red text-white font-bold rounded-xl shadow-md"
                  >
                    Create Series
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* CUSTOM CONFIRMATION MODAL PORTAL */}
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
                <button
                  type="button"
                  onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                  className="flex-1 py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm transition cursor-pointer border border-slate-700"
                >
                  បោះបង់ (Cancel)
                </button>
                <button
                  type="button"
                  onClick={confirmModal.onConfirm}
                  className="flex-1 py-3 px-4 rounded-2xl text-white font-bold text-xs sm:text-sm transition shadow-lg cursor-pointer bg-red-600 hover:bg-red-700 shadow-red-600/30"
                >
                  លុប (Delete)
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </AdminLayout>
  );
}
