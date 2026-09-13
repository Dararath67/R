'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useData } from '@/context/DataContext';
import { api } from '@/lib/api';
import { ArrowLeft, Save, Upload, CheckCircle2, Film, Image as ImageIcon, Sparkles, EyeOff, Check, Flame, Star, Award, AlertCircle, Download, Loader2 } from 'lucide-react';
import { SAMPLE_VIDEOS } from '@/lib/initialData';

export default function AddMoviePage() {
  const router = useRouter();
  const { addMovie, genres } = useData();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [releaseYear, setReleaseYear] = useState<number>(new Date().getFullYear());
  const [rating, setRating] = useState<number>(8.5);
  const [duration, setDuration] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [backdropUrl, setBackdropUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [trailerUrl, setTrailerUrl] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [cast, setCast] = useState('');
  const [director, setDirector] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isTrending, setIsTrending] = useState(true);
  const [isPopular, setIsPopular] = useState(true);
  const [isLatest, setIsLatest] = useState(true);

  // Upload States
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [uploadingBackdrop, setUploadingBackdrop] = useState(false);
  const [downloadingUrl, setDownloadingUrl] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [titleError, setTitleError] = useState(false);

  // Auto Caption State & Toggles
  const [autoCaption, setAutoCaption] = useState<boolean>(true);
  const [extractingCaption, setExtractingCaption] = useState<boolean>(false);

  // Telegram Bot Auto-Fill State
  const [lastTgTimestamp, setLastTgTimestamp] = useState<number>(Date.now());
  const [tgAutoNotice, setTgAutoNotice] = useState<string>('');
  const [showTgPickerModal, setShowTgPickerModal] = useState(false);
  const [tgVideoHistory, setTgVideoHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const autoExtractTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleApplyAutoCaption = async (targetUrlOrName: string, directCaption?: string) => {
    if (!targetUrlOrName && !directCaption) return;
    try {
      setExtractingCaption(true);
      const meta = await api.extractVideoCaption({
        url: targetUrlOrName,
        caption: directCaption,
        filename: targetUrlOrName.includes('/') ? targetUrlOrName.split('/').pop() : targetUrlOrName,
      });
      if (meta) {
        if (meta.videoUrl && meta.videoUrl.startsWith('http')) {
          setVideoUrl(meta.videoUrl);
        }
        if (meta.posterUrl) {
          setPosterUrl(meta.posterUrl);
          setBackdropUrl(meta.posterUrl);
        }
        if (meta.title) {
          setTitle(meta.title);
          setTitleError(false);
        }
        if (meta.description) {
          setDescription(meta.description);
        }
        if (meta.releaseYear && meta.releaseYear > 1900) {
          setReleaseYear(meta.releaseYear);
        }
      }
    } catch (err) {
      console.warn('Auto caption extraction error:', err);
    } finally {
      setExtractingCaption(false);
    }
  };

  const handleOpenTgPicker = async () => {
    setShowTgPickerModal(true);
    setLoadingHistory(true);
    try {
      const history = await api.getTelegramVideoHistory();
      setTgVideoHistory(history);
    } catch {}
    finally {
      setLoadingHistory(false);
    }
  };

  const autoCapturePosterFromVideo = async (targetUrl: string) => {
    if (!targetUrl || !targetUrl.trim()) return;
    try {
      setUploadingPoster(true);
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      const formattedUrl = targetUrl.includes('/uploads/')
        ? `http://us.apsara.lol:15511${targetUrl.substring(targetUrl.indexOf('/uploads/'))}`
        : targetUrl;
      video.src = formattedUrl;
      video.currentTime = 1;

      await new Promise((resolve) => {
        const timeout = setTimeout(() => resolve(null), 3000);
        video.onloadeddata = () => { video.currentTime = 1; };
        video.onseeked = () => { clearTimeout(timeout); resolve(null); };
        video.onerror = () => { clearTimeout(timeout); resolve(null); };
      });

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (ctx && video.videoWidth > 0) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(async (blob) => {
          if (blob) {
            const file = new File([blob], `frame_${Date.now()}.jpg`, { type: 'image/jpeg' });
            try {
              const res = await api.uploadImage(file);
              if (res && res.url) {
                setPosterUrl(res.url);
                setBackdropUrl((prev) => prev || res.url);
              }
            } catch {}
          }
          setUploadingPoster(false);
        }, 'image/jpeg', 0.9);
      } else {
        setUploadingPoster(false);
      }
    } catch (err) {
      setUploadingPoster(false);
    } finally {
      setUploadingPoster(false);
    }
  };

  React.useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const latest = await api.getLatestTelegramUpload();
        if (latest && latest.timestamp > lastTgTimestamp && latest.url) {
          setVideoUrl(latest.url);
          if (latest.posterUrl) {
            setPosterUrl(latest.posterUrl);
            setBackdropUrl((prev) => prev || latest.posterUrl);
          } else {
            autoCapturePosterFromVideo(latest.url);
          }
          if (autoCaption) {
            handleApplyAutoCaption(latest.url, latest.caption || latest.filename);
          }
          setLastTgTimestamp(latest.timestamp);
          setTgAutoNotice(`បានទទួលវីដេអូថ្មីពី Telegram Bot: ${latest.title || latest.filename || 'វីដេអូថ្មី'}`);
          setTimeout(() => setTgAutoNotice(''), 7000);
        }
      } catch {}
    }, 2500);
    return () => clearInterval(interval);
  }, [lastTgTimestamp, autoCaption, title]);

  // Alert Modal State
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

  const handleDownloadVideoUrl = async () => {
    if (!videoUrl || !videoUrl.trim()) {
      showAlert('ខ្វះព័ត៌មាន', 'សូមបញ្ចូលតំណភ្ជាប់វីដេអូ URL ជាមុនសិន!');
      return;
    }
    if (videoUrl.includes('/uploads/videos/')) {
      showAlert('ព័ត៌មាន', 'វីដេអូនេះត្រូវបានរក្សាទុកក្នុង Server រួចរាល់ហើយ!');
      return;
    }

    setDownloadingUrl(true);
    try {
      const res = await api.downloadVideoFromUrl(videoUrl.trim());
      if (res.url) {
        setVideoUrl(res.url);
        if (res.posterUrl) {
          setPosterUrl(res.posterUrl);
          setBackdropUrl((prev) => prev || res.posterUrl);
        } else {
          autoCapturePosterFromVideo(res.url);
        }
        if (autoCaption) {
          handleApplyAutoCaption(res.url);
        }
        showAlert('ជោគជ័យ', 'បានទាញយក និងកាត់រូបភាព Poster តាមវីដេអូដោយជោគជ័យ!');
      }
    } catch (err: any) {
      showAlert('បរាជ័យ', err.message || 'បរាជ័យក្នុងការទាញយកវីដេអូពី Link');
    } finally {
      setDownloadingUrl(false);
    }
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
      if (res.posterUrl) {
        setPosterUrl(res.posterUrl);
        if (!backdropUrl) setBackdropUrl(res.posterUrl);
      } else {
        autoCapturePosterFromVideo(res.url);
      }
      if (autoCaption) {
        handleApplyAutoCaption(file.name);
      }
      if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      showAlert('ជោគជ័យ', 'បានផ្ទុកឡើងវីដេអូ និងទាញយក Caption/Poster ដោយជោគជ័យ!');
    } catch (err: any) {
      showAlert('បរាជ័យ', err?.message || 'បរាជ័យក្នុងការផ្ទុកឡើងឯកសារវីដេអូ');
    } finally {
      setUploadingVideo(false);
      setUploadProgress(0);
    }
  };

  const handleAutoCaptureFrame = async () => {
    if (!videoUrl) {
      showAlert('ខ្វះព័ត៌មាន', 'សូមបញ្ចូល ឬ ផ្ទុកឡើង Video URL ជាមុនសិន!');
      return;
    }
    await autoCapturePosterFromVideo(videoUrl);
    showAlert('ជោគជ័យ', 'បានកាត់រូបភាព Poster តាមវីដេអូដោយជោគជ័យ!');
  };

  const handlePosterFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingPoster(true);
      const res = await api.uploadImage(file);
      setPosterUrl(res.url);
    } catch (err) {
      showAlert('បរាជ័យ', 'បរាជ័យក្នុងការផ្ទុកឡើងរូបភាព Poster');
    } finally {
      setUploadingPoster(false);
    }
  };

  const handleBackdropFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingBackdrop(true);
      const res = await api.uploadImage(file);
      setBackdropUrl(res.url);
    } catch (err) {
      showAlert('បរាជ័យ', 'បរាជ័យក្នុងការផ្ទុកឡើងរូបភាព Backdrop');
    } finally {
      setUploadingBackdrop(false);
    }
  };

  const handleSaveAndPost = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    if (!title || !title.trim()) {
      setTitleError(true);
      showAlert('ខ្វះចំណងជើងភាពយន្ត', 'សូមបញ្ចូល «ចំណងជើងភាពយន្ត *» នៅផ្នែកខាងលើជាមុនសិន!');
      return;
    }
    if (!videoUrl || !videoUrl.trim()) {
      showAlert('ខ្វះព័ត៌មាន', 'សូមបញ្ចូល ឬ ផ្ទុកឡើងឯកសារវីដេអូ!');
      return;
    }

    try {
      setIsSubmitting(true);
      await addMovie({
        title: title.trim(),
        description: description.trim(),
        posterUrl: posterUrl.trim(),
        backdropUrl: backdropUrl.trim() || posterUrl.trim(),
        trailerUrl: trailerUrl.trim(),
        videoUrl: videoUrl.trim(),
        releaseYear,
        rating,
        duration: duration.trim() || '1h 30m',
        type: 'movie',
        genres: selectedGenres.length > 0 ? selectedGenres : ['General'],
        cast: cast.trim() ? cast.split(',').map((c) => c.trim()).filter(Boolean) : [],
        director: director.trim(),
        isPublished,
        isFeatured,
        isTrending,
        isPopular,
        isLatest,
        subtitles: [
          { id: 's1', label: 'English', lang: 'en', src: '' },
          { id: 's2', label: 'Khmer', lang: 'km', src: '' },
        ],
      });

      window.location.href = '/admin/movies';
    } catch (err: any) {
      console.error('Add movie error:', err);
      showAlert('បរាជ័យ', err?.message || 'បរាជ័យក្នុងការរក្សាទុកភាពយន្ត');
      setIsSubmitting(false);
    }
  };

  const toggleGenre = (genreName: string) => {
    if (selectedGenres.includes(genreName)) {
      setSelectedGenres(selectedGenres.filter((g) => g !== genreName));
    } else {
      setSelectedGenres([...selectedGenres, genreName]);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-xs"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-slate-900">បញ្ចូលភាពយន្តថ្មី (ផ្ទុកឡើងវីដេអូផ្ទាល់)</h1>
              <p className="text-xs text-slate-500 font-medium">ផ្ទុកឡើងឯកសារវីដេអូ MP4 និងរូបភាព Poster ដោយផ្ទាល់</p>
            </div>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSaveAndPost(); }} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Title */}
            <div className="md:col-span-2 space-y-1.5" id="title-field">
              <label className="block font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span>ចំណងជើងភាពយន្ត *</span>
                {titleError && <span className="text-brand-red text-xs normal-case font-bold animate-pulse">សូមបញ្ចូលចំណងជើងភាពយន្ត!</span>}
              </label>
              <input
                id="movie-title-input"
                type="text"
                placeholder="ឧ. ភាពយន្ត..."
                value={title}
                onChange={(e) => { setTitle(e.target.value); setTitleError(false); }}
                className={`w-full bg-slate-50 border rounded-xl p-3 text-sm focus:outline-none transition-all ${
                  titleError ? 'border-brand-red ring-2 ring-brand-red/30 bg-red-50/20' : 'border-slate-200 text-slate-900 focus:border-brand-red focus:bg-white'
                }`}
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="block font-bold text-slate-700 uppercase tracking-wider">
                សង្ខេបរឿង / ការពិពណ៌នា
              </label>
              <textarea
                rows={3}
                placeholder="សង្ខេបរឿងភាគ ឬភាពយន្ត..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-3 text-sm focus:border-brand-red focus:bg-white focus:outline-none"
              />
            </div>

              {/* DIRECT VIDEO UPLOAD SECTION */}
            <div className="md:col-span-2 bg-slate-50 border-2 border-dashed border-slate-300 p-5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="block font-extrabold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                  <Film className="w-4 h-4 text-brand-red" />
                  <span>ផ្ទុកឡើងឯកសារវីដេអូភាពយន្ត (MP4 / WebM / MOV) *</span>
                </label>
                {uploadingVideo && (
                  <span className="text-xs font-bold text-brand-red animate-pulse">កំពុងផ្ទុកឡើងវីដេអូ... {uploadProgress > 0 ? `(${uploadProgress}%)` : ''}</span>
                )}
              </div>

              {/* TELEGRAM BOT AUTO-FILL NOTICE */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 p-3 rounded-xl flex items-center justify-between text-xs text-blue-900 shadow-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                  <span><b>Telegram Auto-Fill:</b> ផ្ញើវីដេអូទៅ Telegram Bot នោះ Link នឹងរត់ចូលប្រអប់នេះដោយស្វ័យប្រវត្តិ!</span>
                </div>
              </div>

              {/* AUTO CAPTION TOGGLE BUTTONS */}
              <div className="bg-slate-100 border border-slate-200 p-3 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                  <div className="text-xs">
                    <span className="font-extrabold text-slate-900">Auto Caption ពី Video Link: </span>
                    <span className="text-slate-500 font-medium">ស្រង់ចំណងជើង និងការពិពណ៌នាស្វ័យប្រវត្តិ</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setAutoCaption(true);
                        if (videoUrl) handleApplyAutoCaption(videoUrl);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center space-x-1 cursor-pointer ${
                        autoCaption
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      {autoCaption && <Check className="w-3 h-3 text-white" />}
                      <span>Yes</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAutoCaption(false)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        !autoCaption
                          ? 'bg-slate-800 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <span>No</span>
                    </button>
                  </div>
                  {videoUrl && (
                    <button
                      type="button"
                      onClick={() => handleApplyAutoCaption(videoUrl)}
                      disabled={extractingCaption}
                      className="px-2.5 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-800 text-[11px] font-bold rounded-xl flex items-center space-x-1 transition-all cursor-pointer border border-purple-200 disabled:opacity-50"
                      title="ស្រង់ Caption ពី Link នេះ"
                    >
                      {extractingCaption ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-purple-600" />}
                      <span>ស្រង់ Caption</span>
                    </button>
                  )}
                </div>
              </div>

              {uploadingVideo && (
                <div className="space-y-1.5 bg-red-50 p-3 rounded-xl border border-red-200 animate-fade-in">
                  <div className="flex items-center justify-between text-xs font-bold text-brand-red">
                    <span className="flex items-center space-x-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>កំពុងផ្ទុកឡើងវីដេអូទៅកាន់ Server... {uploadProgress > 0 ? `(${uploadProgress}%)` : ''}</span>
                    </span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-red-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-brand-red h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(uploadProgress, 5)}%` }}
                    />
                  </div>
                </div>
              )}

              {tgAutoNotice && (
                <div className="bg-emerald-600 text-white p-4 rounded-2xl text-xs font-extrabold flex items-center justify-between border-2 border-emerald-400 shadow-xl animate-fade-in">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h5 className="font-bold text-sm">បានជោគជ័យ! (Upload Successful)</h5>
                      <p className="text-[11px] text-emerald-100 font-normal">{tgAutoNotice}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-white/20 rounded-lg text-[10px] uppercase font-mono">Auto-Filled</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <label className="cursor-pointer bg-brand-red hover:bg-brand-crimson text-white font-bold px-4 py-2.5 rounded-xl flex items-center space-x-2 text-xs shadow-md shrink-0">
                  <Upload className="w-4 h-4" />
                  <span>ជ្រើសរើសឯកសារវីដេអូ</span>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoFileChange}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleOpenTgPicker}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3.5 py-2.5 rounded-xl flex items-center space-x-2 text-xs shadow-md shrink-0 transition-all cursor-pointer"
                >
                  <Film className="w-4 h-4 text-indigo-200" />
                  <span>បញ្ជីវីដេអូ Telegram</span>
                </button>

                <span className="text-slate-400 font-bold">ឬ</span>
                <div className="flex items-center space-x-2 w-full">
                  <input
                    type="text"
                    placeholder="បញ្ជូលតំណភ្ជាប់វីដេអូ URL ឬ Link គេហទំព័រ..."
                    value={videoUrl}
                    onPaste={(e) => {
                      const pasted = e.clipboardData.getData('text');
                      if (pasted && pasted.trim().startsWith('http')) {
                        setVideoUrl(pasted.trim());
                        setTimeout(() => handleApplyAutoCaption(pasted.trim()), 100);
                      }
                    }}
                    onChange={(e) => {
                      const val = e.target.value;
                      setVideoUrl(val);
                      if (autoExtractTimerRef.current) clearTimeout(autoExtractTimerRef.current);
                      if (val.trim().length > 8 && val.trim().startsWith('http')) {
                        autoExtractTimerRef.current = setTimeout(() => {
                          handleApplyAutoCaption(val.trim());
                        }, 500);
                      }
                    }}
                    className="flex-grow bg-white border border-slate-200 text-slate-900 rounded-xl p-2.5 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyAutoCaption(videoUrl.trim())}
                    disabled={extractingCaption || !videoUrl.trim()}
                    className="px-3 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shrink-0 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                    title="ស្វែងរកវីដេអូ ចំណងជើង និង Poster ពី Link នេះដោយស្វ័យប្រវត្តិ"
                  >
                    {extractingCaption ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>{extractingCaption ? 'កំពុងស្រង់...' : 'ស្វែងរកវីដេអូ & Caption'}</span>
                  </button>
                  {videoUrl && !videoUrl.includes('/uploads/videos/') && (
                    <button
                      type="button"
                      onClick={handleDownloadVideoUrl}
                      disabled={downloadingUrl}
                      className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shrink-0 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                      title="ទាញយក និងរក្សាទុកវីដេអូក្នុង Server ស្វ័យប្រវត្តិ"
                    >
                      {downloadingUrl ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      <span>{downloadingUrl ? 'កំពុងទាញយក...' : 'ទាញយកក្នុង Server'}</span>
                    </button>
                  )}
                </div>
              </div>

              {videoUrl && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 font-semibold truncate">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                    <span className="truncate">
                      {videoUrl.includes('/uploads/videos/')
                        ? `វីដេអូបានរក្សាទុកក្នុង Server: ${videoUrl}`
                        : `វីដេអូត្រូវបានស្វែងរកឃើញ: ${videoUrl}`}
                    </span>
                  </div>

                  {/* LIVE VIDEO PLAYER PREVIEW */}
                  <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                        <Film className="w-3.5 h-3.5 text-brand-red" />
                        ការមើលវីដេអូសាកល្បង (Live Video Player)
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        {videoUrl.includes('/uploads/videos/') ? 'Local Server MP4' : 'Direct Video Stream'}
                      </span>
                    </div>
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-black flex items-center justify-center border border-slate-800">
                      <video
                        key={videoUrl}
                        src={videoUrl.startsWith('http') && !videoUrl.includes('localhost') && !videoUrl.includes('us.apsara.lol') ? `/api/proxy/video?url=${encodeURIComponent(videoUrl)}` : (videoUrl.includes('/uploads/') ? `http://us.apsara.lol:15511${videoUrl.substring(videoUrl.indexOf('/uploads/'))}` : videoUrl)}
                        controls
                        playsInline
                        preload="metadata"
                        poster={posterUrl || undefined}
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
                  </div>
                </div>
              )}
            </div>

            {/* DIRECT POSTER IMAGE UPLOAD */}
            <div className="space-y-2">
              <label className="block font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                <ImageIcon className="w-4 h-4 text-amber-600" />
                <span>ផ្ទុកឡើងរូបភាព Poster</span>
              </label>
              <div className="flex items-center space-x-2">
                <label className="cursor-pointer bg-slate-800 hover:bg-slate-900 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center space-x-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  <span>ជ្រើសរើស Poster</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePosterFileChange}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleAutoCaptureFrame}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center space-x-1.5 transition-all shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>កាត់រូបតាមវីដេអូ</span>
                </button>
                {uploadingPoster && <span className="text-[10px] text-brand-red animate-pulse">កំពុងផ្ទុកឡើង...</span>}
              </div>
              <input
                type="text"
                placeholder="តំណភ្ជាប់ Poster URL..."
                value={posterUrl}
                onChange={(e) => setPosterUrl(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 text-xs"
              />
            </div>

            {/* DIRECT BACKDROP IMAGE UPLOAD */}
            <div className="space-y-2">
              <label className="block font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                <ImageIcon className="w-4 h-4 text-amber-600" />
                <span>ផ្ទុកឡើងរូបភាព Backdrop</span>
              </label>
              <div className="flex items-center space-x-2">
                <label className="cursor-pointer bg-slate-800 hover:bg-slate-900 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center space-x-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  <span>ជ្រើសរើស Backdrop</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBackdropFileChange}
                    className="hidden"
                  />
                </label>
                {uploadingBackdrop && <span className="text-[10px] text-brand-red animate-pulse">កំពុងផ្ទុកឡើង...</span>}
              </div>
              <input
                type="text"
                placeholder="តំណភ្ជាប់ Backdrop URL..."
                value={backdropUrl}
                onChange={(e) => setBackdropUrl(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 text-xs"
              />
            </div>

            {/* Release Year */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 uppercase tracking-wider">
                ឆ្នាំចេញផ្សាយ
              </label>
              <input
                type="number"
                value={releaseYear}
                onChange={(e) => setReleaseYear(parseInt(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-3 text-sm focus:border-brand-red focus:bg-white focus:outline-none"
              />
            </div>

            {/* Rating */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 uppercase tracking-wider">
                ពិន្ទុវាយតម្លៃ (0 - 10)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={rating}
                onChange={(e) => setRating(parseFloat(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-3 text-sm focus:border-brand-red focus:bg-white focus:outline-none"
              />
            </div>

            {/* Director */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 uppercase tracking-wider">
                អ្នកដឹកនាំ
              </label>
              <input
                type="text"
                value={director}
                onChange={(e) => setDirector(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-3 text-sm focus:border-brand-red focus:bg-white focus:outline-none"
              />
            </div>

            {/* Duration */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 uppercase tracking-wider">
                រយៈពេល
              </label>
              <input
                type="text"
                placeholder="ឧ. 2h 15m"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-3 text-sm focus:border-brand-red focus:bg-white focus:outline-none"
              />
            </div>

            {/* Genres Selector */}
            <div className="md:col-span-2 space-y-2">
              <label className="block font-bold text-slate-700 uppercase tracking-wider">
                ជ្រើសរើសប្រភេទភាពយន្ត
              </label>
              <div className="flex flex-wrap gap-2.5">
                {genres.map((g) => {
                  const isSel = selectedGenres.includes(g.name);
                  return (
                    <button
                      type="button"
                      key={g.id}
                      onClick={() => toggleGenre(g.name)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 transition-all duration-75 active:duration-0 ease-out transform active:scale-95 hover:scale-[1.02] ${
                        isSel
                          ? 'bg-brand-red text-white shadow-md shadow-brand-red/25 ring-2 ring-brand-red/40 scale-[1.02]'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 border border-slate-200'
                      }`}
                    >
                      {isSel && <Check className="w-3.5 h-3.5 text-white flex-shrink-0 animate-fade-in" />}
                      <span>{g.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* HOMEPAGE SECTIONS ASSIGNMENT & BANNER DISPLAY TOGGLES */}
            <div className="md:col-span-2 space-y-4 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider flex items-center space-x-2">
                  <Award className="w-4 h-4 text-brand-red" />
                  <span>កំណត់ការបង្ហាញលើទំព័រដើម (Homepage Sections)</span>
                </h3>
                <label className="flex items-center space-x-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="w-4 h-4 accent-brand-red rounded transition-all cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-800 select-none">បោះពុម្ពផ្សាយ</span>
                </label>
              </div>

              {/* 1. Hero Banner Toggle */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-brand-red" />
                    <span>១. ការបង្ហាញលើ Hero Banner</span>
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIsFeatured(true)}
                    className={`p-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 border transition-all duration-75 active:duration-0 ease-out transform active:scale-95 ${
                      isFeatured
                        ? 'bg-brand-red text-white border-brand-red shadow-md ring-2 ring-brand-red/30'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>បង្ហាញលើ Banner (Show in Banner)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFeatured(false)}
                    className={`p-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 border transition-all duration-75 active:duration-0 ease-out transform active:scale-95 ${
                      !isFeatured
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/30'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <EyeOff className="w-4 h-4" />
                    <span>មិនបង្ហាញលើ Banner</span>
                  </button>
                </div>
              </div>

              {/* 2. Trending Movies Section Toggle */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs flex items-center space-x-2">
                    <Flame className="w-4 h-4 text-amber-500" />
                    <span>២. ផ្នែក កំពុងពេញនិយមខ្លាំង (Trending Movies)</span>
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIsTrending(true)}
                    className={`p-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 border transition-all duration-75 active:duration-0 ease-out transform active:scale-95 ${
                      isTrending
                        ? 'bg-amber-500 text-white border-amber-500 shadow-md ring-2 ring-amber-500/30'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Flame className="w-4 h-4" />
                    <span>បន្ថែមចូល កំពុងពេញនិយមខ្លាំង</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsTrending(false)}
                    className={`p-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 border transition-all duration-75 active:duration-0 ease-out transform active:scale-95 ${
                      !isTrending
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/30'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <EyeOff className="w-4 h-4" />
                    <span>មិនបញ្ចូល កំពុងពេញនិយម</span>
                  </button>
                </div>
              </div>

              {/* 3. Popular Movies Section Toggle */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs flex items-center space-x-2">
                    <Film className="w-4 h-4 text-blue-600" />
                    <span>៣. ផ្នែក ភាពយន្ត និងរឿងភាគល្បីៗ (Popular Movies)</span>
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIsPopular(true)}
                    className={`p-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 border transition-all duration-75 active:duration-0 ease-out transform active:scale-95 ${
                      isPopular
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-600/30'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Film className="w-4 h-4" />
                    <span>បន្ថែមចូល ភាពយន្តល្បីៗ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPopular(false)}
                    className={`p-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 border transition-all duration-75 active:duration-0 ease-out transform active:scale-95 ${
                      !isPopular
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/30'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <EyeOff className="w-4 h-4" />
                    <span>មិនបញ្ចូល ភាពយន្តល្បីៗ</span>
                  </button>
                </div>
              </div>

              {/* 4. Recommended / Latest Movies Section Toggle */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs flex items-center space-x-2">
                    <Star className="w-4 h-4 text-purple-600" />
                    <span>៤. ផ្នែក ភាពយន្តណែនាំពិសេស (Recommended Movies)</span>
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIsLatest(true)}
                    className={`p-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 border transition-all duration-75 active:duration-0 ease-out transform active:scale-95 ${
                      isLatest
                        ? 'bg-purple-600 text-white border-purple-600 shadow-md ring-2 ring-purple-600/30'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Star className="w-4 h-4" />
                    <span>បន្ថែមចូល ភាពយន្តណែនាំពិសេស</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsLatest(false)}
                    className={`p-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 border transition-all duration-75 active:duration-0 ease-out transform active:scale-95 ${
                      !isLatest
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/30'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <EyeOff className="w-4 h-4" />
                    <span>មិនបញ្ចូល ភាពយន្តណែនាំ</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200 flex justify-end">
            <button
              type="button"
              onClick={handleSaveAndPost}
              disabled={isSubmitting || uploadingVideo || uploadingPoster}
              className="px-8 py-3 bg-brand-red hover:bg-brand-crimson text-white font-bold rounded-2xl shadow-md shadow-brand-red/20 flex items-center space-x-2 text-sm disabled:opacity-50 transition-all duration-75 active:duration-0 transform active:scale-95 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>កំពុងរក្សាទុក...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>រក្សាទុក និងបោះពុម្ពផ្សាយភាពយន្ត</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

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
      {/* TELEGRAM VIDEO PICKER MODAL */}
      {showTgPickerModal && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Film className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">ជ្រើសរើសវីដេអូពី Telegram Library</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTgPickerModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {loadingHistory ? (
              <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                <span>កំពុងទាញយកបញ្ជីវីដេអូពី Server...</span>
              </div>
            ) : tgVideoHistory.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 space-y-2">
                <p>មិនទាន់មានវីដេអូបាន Upload តាម Telegram Bot ឡើយ។</p>
                <p className="text-[11px] text-slate-500">សូមផ្ញើឯកសារវីដេអូទៅកាន់ Telegram Bot របស់អ្នកដើម្បីបន្ថែមវីដេអូទីនេះ!</p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-2.5 pr-1">
                {tgVideoHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-800/80 border border-slate-700/80 p-3 rounded-2xl flex items-center justify-between hover:border-indigo-500 transition-all"
                  >
                    <div className="truncate pr-3">
                      <h4 className="text-xs font-bold text-slate-200 truncate">{item.filename}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{item.size} • {new Date(item.timestamp).toLocaleString()}</p>
                    </div>
                      <button
                        type="button"
                        onClick={() => {
                          setVideoUrl(item.url);
                          if (item.posterUrl) {
                            setPosterUrl(item.posterUrl);
                            setBackdropUrl((prev) => prev || item.posterUrl);
                          } else {
                            autoCapturePosterFromVideo(item.url);
                          }
                          if (autoCaption) {
                            handleApplyAutoCaption(item.url, item.caption || item.title || item.filename);
                          }
                          setShowTgPickerModal(false);
                        }}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shrink-0 transition-all cursor-pointer shadow-md"
                      >
                        ជ្រើសរើសយក
                      </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </AdminLayout>
  );
}
