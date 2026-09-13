'use client';

import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, UploadCloud, Film, Image as ImageIcon, CheckCircle2, AlertCircle, Loader2, FileVideo, HardDrive, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { api } from '@/lib/api';

interface UserUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserUploadModal: React.FC<UserUploadModalProps> = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();
  const { addMovie, movies } = useData();

  const userPendingMovies = movies.filter(
    (m) => m.uploadedByUserId === currentUser?.id && (m.approvalStatus === 'pending' || !m.isPublished)
  );
  const isLimitReached = userPendingMovies.length >= 3;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Local Device File States
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const videoInputRef = useRef<HTMLInputElement>(null);
  const posterInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setErrorMsg('');
    }
  };

  const handlePosterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPosterFile(file);
      setPosterPreview(URL.createObjectURL(file));
      setErrorMsg('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setErrorMsg('សូមបញ្ចូលចំណងជើងវីដេអូ');
      return;
    }

    if (!videoFile) {
      setErrorMsg('សូមជ្រើសរើសឯកសារវីដេអូពីក្នុង Device របស់អ្នក (MP4, MKV, MOV...)');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // 1. Upload Video File from Device
      setUploadProgress('កំពុង Upload វីដេអូពី Device... (Uploading Video)');
      const videoRes = await api.uploadVideo(videoFile);
      const videoUrl = videoRes?.url || '';

      if (!videoUrl) {
        throw new Error('បរាជ័យក្នុងការ Upload វីដេអូពី Device');
      }

      // 2. Upload Poster Image from Device (if selected, otherwise use auto-extracted poster from video)
      let posterUrl = videoRes?.posterUrl || '';
      if (posterFile) {
        setUploadProgress('កំពុង Upload រូបភាព Poster...');
        const posterRes = await api.uploadImage(posterFile);
        if (posterRes?.url) {
          posterUrl = posterRes.url;
        }
      }

      // 3. Save Record in Database
      setUploadProgress('កំពុងរក្សាទុកព័ត៌មាន...');
      await addMovie({
        title: title.trim(),
        description: description.trim() || 'វីដេអូត្រូវបាន Upload ដោយជោគជ័យ',
        posterUrl: posterUrl,
        backdropUrl: posterUrl,
        trailerUrl: '',
        videoUrl: videoUrl,
        releaseYear: new Date().getFullYear(),
        rating: 8.5,
        duration: '1h 30m',
        type: 'movie',
        genres: ['General'],
        isFeatured: false,
        isTrending: true,
        isPopular: true,
        isLatest: true,
        isPublished: true,
        cast: [],
        director: currentUser?.name || 'User Upload',
        uploadedByUserId: currentUser?.id,
        uploadedByUserName: currentUser?.name,
        uploadedByAvatar: currentUser?.avatar,
        approvalStatus: 'approved',
      } as any);

      setSuccessMsg('វីដេអូរបស់អ្នកត្រូវបាន Upload និងផ្សព្វផ្សាយលើ Website ជោគជ័យ!');
      setTitle('');
      setDescription('');
      setVideoFile(null);
      setPosterFile(null);
      setPosterPreview('');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'មានបញ្ហាក្នុងការ Upload! សូមព្យាយាមម្តងទៀត។');
    } finally {
      setIsSubmitting(false);
      setUploadProgress('');
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[999999] overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 font-sans animate-fade-in">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900 my-auto max-h-[85vh] sm:max-h-[90vh] flex flex-col min-h-0 animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-brand-red text-white shadow-md shadow-brand-red/30 shrink-0">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black">អាប់ឡូតវីដេអូពី Device</h3>
              <p className="text-xs text-slate-400">ជ្រើសរើសវីដេអូពីក្នុងម៉ាស៊ីនដើម្បីផ្ញើជូន Admin ពិនិត្យ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
          {successMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-start space-x-3 text-xs font-bold animate-fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {isLimitReached && (
            <div className="p-4 bg-amber-50 border border-amber-300 text-amber-900 rounded-2xl flex items-start space-x-3 text-xs font-bold animate-fade-in">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-black text-amber-950 text-sm">ដែនកំណត់អាប់ឡូត (Upload Limit Reached)</p>
                <p className="mt-1 font-medium leading-relaxed">
                  អ្នកបានអាប់ឡូតវីដេអូរង់ចាំការអនុម័ត (Pending) ចំនួន ៣/៣ រួចហើយ! សូមរង់ចាំ Admin ពិនិត្យ និងអនុម័តវីដេអូចាស់ៗអស់សិន ទើបអាច Upload វីដេអូថ្មីបន្ថែមទៀតបាន (ដើម្បីការពារ Spam)។
                </p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center space-x-3 text-xs font-bold animate-fade-in">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Title Input */}
          <div>
            <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
              ចំណងជើងរឿង / វីដេអូ <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Film className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="បញ្ចូលចំណងជើងរឿង..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold text-slate-900 focus:outline-none focus:border-brand-red focus:bg-white transition-all placeholder:font-normal"
              />
            </div>
          </div>

          {/* Description Input */}
          <div>
            <label className="block text-xs font-extrabold text-slate-800 mb-1.5">ការពិពណ៌នា (Description)</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="រៀបរាប់សង្ខេបអំពីសាច់រឿង (បើមាន)..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold text-slate-900 focus:outline-none focus:border-brand-red focus:bg-white transition-all placeholder:font-normal"
            />
          </div>

          {/* Video Device Upload */}
          <div>
            <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
              ជ្រើសរើសឯកសារវីដេអូពី Device <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              ref={videoInputRef}
              accept="video/*"
              onChange={handleVideoChange}
              className="hidden"
            />
            <div
              onClick={() => videoInputRef.current?.click()}
              className={`p-4 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all ${
                videoFile
                  ? 'bg-emerald-50/80 border-emerald-300 text-emerald-800'
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
              }`}
            >
              <FileVideo className={`w-8 h-8 mb-2 ${videoFile ? 'text-emerald-600' : 'text-slate-400'}`} />
              {videoFile ? (
                <div className="text-center space-y-0.5">
                  <p className="text-xs font-black truncate max-w-xs">{videoFile.name}</p>
                  <p className="text-[10px] text-emerald-600 font-mono font-bold">
                    {(videoFile.size / (1024 * 1024)).toFixed(1)} MB • ចុចដើម្បីប្តូរវីដេអូ
                  </p>
                </div>
              ) : (
                <div className="text-center space-y-1">
                  <p className="text-xs font-bold text-slate-800">ចុចជ្រើសរើសវីដេអូពីក្នុងម៉ាស៊ីន (Choose Video)</p>
                  <p className="text-[10px] text-slate-400">ទ្រង់ទ្រាយដែលគាំទ្រ: MP4, MKV, WebM, MOV</p>
                </div>
              )}
            </div>
          </div>

          {/* Poster Device Upload */}
          <div>
            <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
              ជ្រើសរើសរូបភាព Poster ពី Device (ផ្សែង)
            </label>
            <input
              type="file"
              ref={posterInputRef}
              accept="image/*"
              onChange={handlePosterChange}
              className="hidden"
            />
            <div
              onClick={() => posterInputRef.current?.click()}
              className="p-3 border border-slate-200 rounded-2xl bg-slate-50 hover:bg-slate-100 flex items-center space-x-3 cursor-pointer transition-all"
            >
              {posterPreview ? (
                <img src={posterPreview} alt="Poster" className="w-10 h-14 object-cover rounded-lg border border-slate-300 shrink-0" />
              ) : (
                <div className="w-10 h-14 bg-slate-200 rounded-lg flex items-center justify-center text-slate-400 shrink-0">
                  <ImageIcon className="w-5 h-5" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">
                  {posterFile ? posterFile.name : 'ចុចជ្រើសរើសរូបភាព Poster...'}
                </p>
                <p className="text-[10px] text-slate-400 font-medium">JPG, PNG, WEBP</p>
              </div>
            </div>
          </div>

          {/* Uploading Status Loader */}
          {uploadProgress && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center space-x-3 text-xs font-bold text-amber-800 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-amber-600 shrink-0" />
              <span>{uploadProgress}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              បិទ (Close)
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isLimitReached}
              className="px-6 py-2.5 bg-brand-red hover:bg-red-700 text-white rounded-xl text-xs font-extrabold shadow-md shadow-brand-red/30 flex items-center space-x-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>កំពុង Upload...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>ផ្ញើវីដេអូដើម្បីអនុម័ត</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (typeof window !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
};
