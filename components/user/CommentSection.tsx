'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Star, MessageSquare, Send, User as UserIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Comment } from '@/lib/types';

interface CommentSectionProps {
  movieId: string;
}

export const CommentSection: React.FC<CommentSectionProps> = ({ movieId }) => {
  const { currentUser, isAuthenticated } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

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

  useEffect(() => {
    fetchComments();
  }, [movieId]);

  const fetchComments = async () => {
    try {
      const data = await api.getMovieComments(movieId);
      setComments(data || []);
    } catch (err) {
      console.error('Failed to fetch comments', err);
    }
  };

  const averageRating = React.useMemo(() => {
    if (comments.length === 0) return 4.8;
    const sum = comments.reduce((acc, c) => acc + (c.rating || 5), 0);
    return (sum / comments.length).toFixed(1);
  }, [comments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    if (!currentUser) {
      showAlert('សូមចូលប្រើប្រាស់', 'សូមចូលប្រើប្រាស់គណនីជាមុនសិន ដើម្បីបញ្ចេញមតិ! (Please sign in to comment)');
      return;
    }

    setSubmitting(true);
    try {
      await api.postMovieComment(movieId, newComment.trim(), rating);
      await fetchComments();
      setNewComment('');
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 3000);
    } catch (err: any) {
      showAlert('បរាជ័យ', err.message || 'មិនអាចផ្ញើ comment បានទេ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
      {/* Header & Rating Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-6 gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              មតិយោបល់ និងការវាយតម្លៃ ({comments.length})
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              ចែករំលែកអារម្មណ៍របស់អ្នកអំពីភាពយន្តនេះជាមួយទស្សនិកជនដទៃទៀត
            </p>
          </div>
        </div>

        {/* Rating Score Badge */}
        <div className="flex items-center space-x-3 bg-amber-50/80 border border-amber-200/80 px-4 py-2 rounded-2xl self-start sm:self-auto">
          <div className="flex items-center space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-4 h-4 ${
                  star <= Math.round(Number(averageRating))
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-slate-300'
                }`}
              />
            ))}
          </div>
          <span className="text-sm font-black text-amber-700">{averageRating} / 5</span>
        </div>
      </div>

      {/* Write Comment Form */}
      {isAuthenticated ? (
        <form onSubmit={handleSubmit} className="space-y-4 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img
                src={currentUser?.avatar}
                alt={currentUser?.name}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-200"
              />
              <span className="text-xs font-bold text-slate-800">{currentUser?.name}</span>
            </div>

            {/* Interactive Star Picker */}
            <div className="flex items-center space-x-1">
              <span className="text-[11px] font-bold text-slate-500 mr-2">ពិន្ទុរបស់អ្នក:</span>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-0.5 focus:outline-none transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-4 h-4 ${
                      star <= (hoverRating || rating)
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-slate-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <textarea
            rows={3}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="សរសេរមតិយោបល់របស់អ្នកនៅទីនេះ..."
            className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl p-3 text-xs focus:border-brand-red focus:outline-none font-medium placeholder-slate-400"
          />

          <div className="flex items-center justify-between pt-1">
            {successMsg ? (
              <span className="text-xs font-bold text-emerald-600 flex items-center space-x-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>បានបញ្ជូនមតិយោបល់រៀបរយហើយ!</span>
              </span>
            ) : (
              <span />
            )}
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="px-5 py-2.5 bg-brand-red hover:bg-brand-crimson disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md shadow-brand-red/20 flex items-center space-x-2 transition-all hover:scale-105"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'កំពុងផ្ញើ...' : 'បញ្ជូនមតិ'}</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
          សូមចូលប្រើប្រាស់គណនី ដើម្បីបញ្ចេញមតិយោបល់ និងវាយតម្លៃភាពយន្តនេះ។
        </div>
      )}

      {/* Comment List */}
      <div className="space-y-4 pt-2">
        {comments.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">
            មិនទាន់មានមតិយោបល់នៅឡើយទេ។ សូមធ្វើជាអ្នកបញ្ចេញមតិដំបូងគេ!
          </p>
        ) : (
          comments.map((c) => (
            <div
              key={c.id}
              className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <img
                    src={c.userAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user'}
                    alt={c.userName}
                    className="w-7 h-7 rounded-full object-cover border border-slate-200"
                  />
                  <div>
                    <span className="text-xs font-extrabold text-slate-800 block">
                      {c.userName}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {new Date(c.createdAt).toLocaleDateString('km-KH', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-3 h-3 ${
                        star <= (c.rating || 5)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-200'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed font-medium pl-9">
                {c.content}
              </p>
            </div>
          ))
        )}
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
    </div>
  );
};
