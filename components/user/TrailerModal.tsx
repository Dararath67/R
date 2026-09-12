'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { X, Play, Film } from 'lucide-react';

interface TrailerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  trailerUrl?: string;
}

export const TrailerModal: React.FC<TrailerModalProps> = ({
  isOpen,
  onClose,
  title,
  trailerUrl,
}) => {
  if (!isOpen) return null;

  // Helper to convert YouTube URL to embed format if needed
  const getEmbedUrl = (url?: string) => {
    if (!url) return '';
    if (url.includes('youtube.com/watch?v=')) {
      return url.replace('watch?v=', 'embed/') + '?autoplay=1';
    }
    if (url.includes('youtu.be/')) {
      const id = url.split('youtu.be/')[1];
      return `https://www.youtube.com/embed/${id}?autoplay=1`;
    }
    return url;
  };

  const embedUrl = getEmbedUrl(trailerUrl);
  const isDirectVideo = embedUrl.endsWith('.mp4') || embedUrl.endsWith('.webm');

  const modalContent = (
    <div className="fixed inset-0 z-[999999] overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 font-sans animate-fade-in">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative z-10 w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-white my-auto max-h-[85vh] flex flex-col min-h-0 animate-scale-up">
        {/* Header Bar */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-brand-red/20 border border-brand-red/40 flex items-center justify-center text-brand-red">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white truncate max-w-md">
                វីដេអូគំរូ (Trailer): {title}
              </h3>
              <p className="text-[10px] text-slate-400">កម្រិតរូបភាព HD 4K Ultra HD</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Video Embed Body */}
        <div className="relative aspect-video w-full bg-black flex items-center justify-center">
          {embedUrl ? (
            isDirectVideo ? (
              <video
                src={embedUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            ) : (
              <iframe
                src={embedUrl}
                title={`Trailer for ${title}`}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )
          ) : (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <Film className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-sm font-bold">មិនទាន់មានវីដេអូ Trailer សម្រាប់ភាពយន្តនេះនៅឡើយទេ</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof window !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
};
