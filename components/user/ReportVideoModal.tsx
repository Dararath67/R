'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X, CheckCircle2, Send } from 'lucide-react';
import { api } from '@/lib/api';

interface ReportVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentId: string;
  contentTitle: string;
  episodeId?: string;
  episodeTitle?: string;
}

export function ReportVideoModal({
  isOpen,
  onClose,
  contentId,
  contentTitle,
  episodeId,
  episodeTitle,
}: ReportVideoModalProps) {
  const [reason, setReason] = useState('វីដេអូមិនដើរ (Video Won\'t Play)');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const presetReasons = [
    'វីដេអូមិនដើរ (Video Won\'t Play)',
    'គ្មានសំឡេង (No Audio)',
    'សំឡេងមិនត្រូវគ្នា (Audio Desync)',
    'រូបភាពខូច (Corrupted Video)',
    'ផ្សេងៗ (Other Issue)'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await api.submitVideoReport({
        contentId,
        contentTitle,
        reason,
        details,
        episodeId,
        episodeTitle,
      });
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'បរាជ័យក្នុងការផ្ញើការរាយការណ៍');
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
            <div className="p-2.5 sm:p-3 bg-red-500/20 border border-red-500/30 text-brand-red rounded-2xl shrink-0">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white leading-snug">រាយការណ៍វីដេអូខូច (Report Video Issue)</h3>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                {contentTitle} {episodeTitle ? `- ${episodeTitle}` : ''}
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

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 min-h-0 pt-4 pr-1">
          {isSuccess ? (
            <div className="py-8 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
              <h4 className="text-sm font-bold text-emerald-300">
                សូមអរគុណ! ការរាយការណ៍របស់អ្នកត្រូវផ្ញើទៅកាន់ Admin រួចរាល់។
              </h4>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="bg-red-950/80 border border-red-500/40 text-red-300 px-4 py-2.5 rounded-xl text-xs">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-extrabold text-slate-300 mb-2">
                  ជ្រើសរើសបញ្ហាដែលជួបប្រទះ (Select Reason) *
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-slate-950 text-slate-100 text-xs px-4 py-3 rounded-2xl border border-slate-800 focus:outline-none focus:border-brand-red font-medium"
                >
                  {presetReasons.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-300 mb-2">
                  ព័ត៌មានបន្ថែម (Additional Details - Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="រៀបរាប់លម្អិតពីនាទី ឬបញ្ហាដែលកើតឡើង..."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="w-full bg-slate-950 text-slate-100 text-xs px-4 py-3 rounded-2xl border border-slate-800 focus:outline-none focus:border-brand-red font-medium resize-none placeholder-slate-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-2xl transition cursor-pointer"
                >
                  បោះបង់ (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-brand-red hover:bg-red-700 text-white text-xs font-extrabold rounded-2xl transition flex items-center gap-2 shadow-lg shadow-brand-red/30 disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>ផ្ញើការរាយការណ៍ (Submit)</span>
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
