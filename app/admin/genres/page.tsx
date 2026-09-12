'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useData } from '@/context/DataContext';
import { Tags, Plus, Trash2 } from 'lucide-react';

export default function AdminGenresPage() {
  const { genres, addGenre, deleteGenre, movies, series } = useData();
  const [newGenreName, setNewGenreName] = useState('');

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

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGenreName.trim()) return;
    addGenre(newGenreName.trim());
    setNewGenreName('');
  };

  const allContent = [...movies, ...series];

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center space-x-3">
              <Tags className="w-7 h-7 text-amber-600" />
              <span>គ្រប់គ្រងប្រភេទភាពយន្ត</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">គ្រប់គ្រងប្រភេទ និងស្លាកភាពយន្ត</p>
          </div>
        </div>

        {/* Add Genre Form */}
        <form onSubmit={handleAdd} className="bg-white border border-slate-200 rounded-3xl p-6 flex gap-4 shadow-sm">
          <input
            type="text"
            required
            placeholder="បញ្ចូលឈ្មោះប្រភេទភាពយន្តថ្មី..."
            value={newGenreName}
            onChange={(e) => setNewGenreName(e.target.value)}
            className="flex-grow bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-red focus:bg-white"
          />
          <button
            type="submit"
            className="px-6 py-2.5 bg-brand-red hover:bg-brand-crimson text-white font-bold rounded-2xl text-xs flex items-center space-x-2 shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>បន្ថែមប្រភេទ</span>
          </button>
        </form>

        {/* Genres List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {genres.map((g) => {
            const count = allContent.filter((m) => m.genres.includes(g.name)).length;
            return (
              <div
                key={g.id}
                className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between shadow-sm"
              >
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{g.name}</h4>
                  <p className="text-[10px] text-slate-500 font-mono font-semibold">{count} ភាពយន្តបានភ្ជាប់</p>
                </div>
                <button
                  onClick={() => {
                    setConfirmModal({
                      isOpen: true,
                      title: 'លុបប្រភេទភាពយន្ត? (Delete Genre)',
                      message: `តើអ្នកពិតជាចង់លុបប្រភេទភាពយន្ត "${g.name}" នេះមែនទេ?`,
                      onConfirm: () => {
                        deleteGenre(g.id);
                        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                      },
                    });
                  }}
                  className="p-2 rounded-xl bg-slate-100 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

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
    </AdminLayout>
  );
}
