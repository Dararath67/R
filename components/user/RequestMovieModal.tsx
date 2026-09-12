'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Film, X, CheckCircle2, Send, Link as LinkIcon, User as UserIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface RequestMovieModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RequestMovieModal({ isOpen, onClose }: RequestMovieModalProps) {
  const { currentUser } = useAuth();
  const [userName, setUserName] = useState('');
  const [title, setTitle] = useState('');
  const [movieLink, setMovieLink] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (currentUser?.name) {
      setUserName(currentUser.name);
    }
  }, [currentUser]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !userName.trim()) return;
    setIsSubmitting(true);
    setErrorMsg('');

    const combinedDetails = movieLink.trim()
      ? `[Link: ${movieLink.trim()}] ${description.trim()}`
      : description.trim();

    try {
      await api.submitMovieRequest({
        title: title.trim(),
        genre: userName.trim(),
        description: combinedDetails,
      });
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setTitle('');
        setMovieLink('');
        setDescription('');
        onClose();
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'បរាជ័យក្នុងការផ្ញើRequest');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[999999] overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 font-sans animate-fade-in">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl text-slate-100 my-auto max-h-[85vh] flex flex-col min-h-0 animate-scale-up">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 pr-2">
            <div className="p-2.5 sm:p-3 bg-brand-red/20 border border-brand-red/30 text-brand-red rounded-2xl shrink-0">
              <Film className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white leading-snug">
                ស្នើសុំរឿងថ្មី (Request Movie)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                ប្រាប់ឈ្មោះរបស់អ្នក និងឈ្មោះរឿងដែលចង់មើល ក្រុមការងារនឹងរកជូន!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-full transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="overflow-y-auto flex-1 min-h-0 pt-4 pr-1">
          {isSuccess ? (
            <div className="py-8 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
              <h4 className="text-sm font-extrabold text-emerald-300">
                សូមអរគុណ! សំណើសុំរឿងរបស់អ្នកត្រូវផ្ញើទៅកាន់ Admin រួចរាល់។
              </h4>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="bg-red-950/80 border border-red-500/40 text-red-300 px-4 py-2.5 rounded-xl text-xs font-bold">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-extrabold text-slate-300 mb-1.5 uppercase tracking-wider">
                  ឈ្មោះរបស់អ្នក (Your Name) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="បញ្ចូលឈ្មោះរបស់អ្នក..."
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full bg-slate-950 text-slate-100 text-xs pl-10 pr-4 py-3 rounded-2xl border border-slate-800 focus:outline-none focus:border-brand-red font-bold placeholder-slate-600"
                  />
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-300 mb-1.5 uppercase tracking-wider">
                  ឈ្មោះរឿង (Movie / Series Title) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="ឧទាហរណ៍: Avatar 3, Spider-Man..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-950 text-slate-100 text-xs pl-10 pr-4 py-3 rounded-2xl border border-slate-800 focus:outline-none focus:border-brand-red font-bold placeholder-slate-600"
                  />
                  <Film className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-300 mb-1.5 uppercase tracking-wider">
                  តំណភ្ជាប់ / លីងរឿង (Movie Link - Optional)
                </label>
                <div className="relative">
                  <input
                    type="url"
                    placeholder="https://... (ដាក់ក៏បាន មិនដាក់ក៏បាន)"
                    value={movieLink}
                    onChange={(e) => setMovieLink(e.target.value)}
                    className="w-full bg-slate-950 text-slate-100 text-xs pl-10 pr-4 py-3 rounded-2xl border border-slate-800 focus:outline-none focus:border-brand-red font-medium placeholder-slate-600"
                  />
                  <LinkIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-300 mb-1.5 uppercase tracking-wider">
                  ការពិពណ៌នាបន្ថែម (Description / Details - Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="ឆ្នាំផលិត ឈ្មោះតួអង្គ ឬព័ត៌មានបន្ថែម..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 text-slate-100 text-xs p-3.5 rounded-2xl border border-slate-800 focus:outline-none focus:border-brand-red font-medium resize-none placeholder-slate-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-2xl transition cursor-pointer"
                >
                  បោះបង់ (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !title.trim() || !userName.trim()}
                  className="px-6 py-2.5 bg-brand-red hover:bg-red-700 text-white text-xs font-extrabold rounded-2xl transition flex items-center gap-2 shadow-lg shadow-brand-red/30 disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'កំពុងផ្ញើ...' : 'ផ្ញើសំណើ (Submit Request)'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof window !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
}
