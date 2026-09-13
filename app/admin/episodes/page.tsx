'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useData } from '@/context/DataContext';
import { api } from '@/lib/api';
import { ListVideo, Plus, Trash2, Upload, Loader2, Sparkles, Check } from 'lucide-react';
import { SAMPLE_VIDEOS } from '@/lib/initialData';

export default function AdminEpisodesPage() {
  const { series, episodes, addEpisode, deleteEpisode } = useData();
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

  const [seriesId, setSeriesId] = useState(series[0]?.id || '');
  const [seasonNumber, setSeasonNumber] = useState(1);
  const [episodeNumber, setEpisodeNumber] = useState(episodes.length + 1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('45m');
  const [videoUrl, setVideoUrl] = useState('');
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [autoCaption, setAutoCaption] = useState(true);

  const handleApplyAutoCaption = async (targetUrlOrName: string) => {
    if (!autoCaption || !targetUrlOrName) return;
    try {
      const meta = await api.extractVideoCaption({
        url: targetUrlOrName,
        filename: targetUrlOrName.includes('/') ? targetUrlOrName.split('/').pop() : targetUrlOrName,
      });
      if (meta) {
        if (meta.videoUrl && meta.videoUrl.startsWith('http')) {
          setVideoUrl(meta.videoUrl);
        }
        if (meta.title && (!title || title.startsWith('tlg_') || title.startsWith('web_') || title.startsWith('dl_') || title.includes('blog-post'))) {
          setTitle(meta.title);
        }
      }
    } catch {}
  };

  const handleVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingVideo(true);
      setUploadProgress(0);
      const res = await api.uploadVideo(file, (percent) => {
        setUploadProgress(percent);
      });
      setVideoUrl(res.url);
      if (autoCaption) {
        handleApplyAutoCaption(file.name);
      }
    } catch (err: any) {
      alert(err?.message || 'Upload failed');
    } finally {
      setUploadingVideo(false);
      setUploadProgress(0);
    }
  };

  const handleAddEpisode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !seriesId || !videoUrl) return;

    addEpisode({
      seriesId,
      seasonNumber,
      episodeNumber,
      title: `S${seasonNumber}:E${episodeNumber} - ${title}`,
      description,
      duration,
      videoUrl,
      thumbnailUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
      subtitles: [{ id: 's1', label: 'English', lang: 'en', src: '' }],
    });

    setTitle('');
    setDescription('');
    setVideoUrl('');
    setShowAddModal(false);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center space-x-3">
              <ListVideo className="w-7 h-7 text-amber-600" />
              <span>Real Episode Management</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Add and manage video streams for TV series episodes.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 bg-brand-red hover:bg-brand-crimson text-white font-bold rounded-2xl text-xs flex items-center space-x-2 shadow-md shadow-brand-red/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Episode</span>
          </button>
        </div>

        {/* Episodes Datatable & Mobile Cards */}
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          {/* Desktop Table View (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-mono border-b border-slate-200">
                <tr>
                  <th className="p-4">Episode Title</th>
                  <th className="p-4">Parent Series</th>
                  <th className="p-4">Duration</th>
                  <th className="p-4">Video Source</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {episodes.map((ep) => {
                  const parentSeries = series.find((s) => s.id === ep.seriesId);
                  return (
                    <tr key={ep.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 flex items-center space-x-3">
                        <img
                          src={ep.thumbnailUrl}
                          alt={ep.title}
                          className="w-12 aspect-video object-cover rounded-lg shadow-sm"
                        />
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{ep.title}</p>
                          <p className="text-[10px] text-slate-500 font-medium line-clamp-1">{ep.description}</p>
                        </div>
                      </td>
                      <td className="p-4 text-slate-700 font-bold">
                        {parentSeries?.title || 'Unknown Series'}
                      </td>
                      <td className="p-4 text-slate-500 font-mono font-semibold">{ep.duration}</td>
                      <td className="p-4 text-slate-500 font-mono text-[10px] truncate max-w-xs">
                        {ep.videoUrl}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => {
                            setConfirmModal({
                              isOpen: true,
                              title: 'លុបភាគភាពយន្ត? (Delete Episode)',
                              message: `តើអ្នកពិតជាចង់លុបភាគ "${ep.title}" នេះមែនទេ?`,
                              onConfirm: () => {
                                deleteEpisode(ep.id);
                                setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                              },
                            });
                          }}
                          className="p-2 rounded-xl bg-slate-100 text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View (< md) */}
          <div className="block md:hidden divide-y divide-slate-100">
            {episodes.map((ep) => {
              const parentSeries = series.find((s) => s.id === ep.seriesId);
              return (
                <div key={ep.id} className="p-4 space-y-3 bg-white">
                  <div className="flex items-start space-x-3">
                    <img
                      src={ep.thumbnailUrl}
                      alt={ep.title}
                      className="w-16 aspect-video object-cover rounded-xl shadow-sm flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-slate-900 text-sm">{ep.title}</h4>
                      <p className="text-xs font-bold text-brand-red mt-0.5">{parentSeries?.title || 'Unknown Series'}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{ep.duration}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="font-mono text-[10px] text-slate-500 truncate max-w-[200px]">{ep.videoUrl}</span>
                    <button
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          title: 'លុបភាគភាពយន្ត? (Delete Episode)',
                          message: `តើអ្នកពិតជាចង់លុបភាគ "${ep.title}" នេះមែនទេ?`,
                          onConfirm: () => {
                            deleteEpisode(ep.id);
                            setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                          },
                        });
                      }}
                      className="p-1.5 rounded-xl bg-slate-100 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Add Episode */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-2xl">
              <h3 className="text-lg font-bold text-slate-900">Add Episode to Series</h3>
              <form onSubmit={handleAddEpisode} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Select Parent Series</label>
                  <select
                    value={seriesId}
                    onChange={(e) => setSeriesId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5"
                  >
                    {series.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 mb-1 font-bold">Season Number</label>
                    <input
                      type="number"
                      value={seasonNumber}
                      onChange={(e) => setSeasonNumber(parseInt(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 mb-1 font-bold">Episode Number</label>
                    <input
                      type="number"
                      value={episodeNumber}
                      onChange={(e) => setEpisodeNumber(parseInt(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Episode Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chapter One: The Vanishing"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5"
                  />
                </div>

                <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="block text-slate-700 font-bold text-xs">Video Stream URL ឬ File Upload *</label>
                    {uploadingVideo && (
                      <span className="text-[10px] font-bold text-brand-red animate-pulse">កំពុងផ្ទុកឡើង... {uploadProgress > 0 ? `(${uploadProgress}%)` : ''}</span>
                    )}
                  </div>

                  {/* Auto Caption Toggle */}
                  <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-200 text-[11px]">
                    <span className="font-bold text-slate-700 flex items-center space-x-1">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      <span>Auto Caption Title:</span>
                    </span>
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => setAutoCaption(true)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          autoCaption ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setAutoCaption(false)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          !autoCaption ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <label className="cursor-pointer bg-brand-red hover:bg-brand-crimson text-white font-bold px-3 py-2 rounded-xl flex items-center space-x-1 text-xs shrink-0 shadow-sm">
                      <Upload className="w-3.5 h-3.5" />
                      <span>ជ្រើសរើសវីដេអូ</span>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={handleVideoFileChange}
                        className="hidden"
                      />
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="បញ្ជូលតំណភ្ជាប់វីដេអូ ឬ /uploads/videos/..."
                      value={videoUrl}
                      onChange={(e) => {
                        setVideoUrl(e.target.value);
                        if (autoCaption && e.target.value.length > 5) {
                          handleApplyAutoCaption(e.target.value);
                        }
                      }}
                      className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl p-2 font-mono text-xs"
                    />
                  </div>

                  {videoUrl && (
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-black flex items-center justify-center border border-slate-300">
                      <video
                        key={videoUrl}
                        src={videoUrl.startsWith('http') && !videoUrl.includes('localhost') && !videoUrl.includes('us.apsara.lol') ? `/api/proxy/video?url=${encodeURIComponent(videoUrl)}` : (videoUrl.includes('/uploads/') ? `http://us.apsara.lol:15511${videoUrl.substring(videoUrl.indexOf('/uploads/'))}` : videoUrl)}
                        controls
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (!target.src.includes('/api/proxy/video') && videoUrl.startsWith('http')) {
                            target.src = `/api/proxy/video?url=${encodeURIComponent(videoUrl)}`;
                            target.load();
                          }
                        }}
                      />
                    </div>
                  )}
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
                    Add Episode
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
