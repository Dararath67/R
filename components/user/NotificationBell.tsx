'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Bell, Check, Film, Info, Sparkles, Send, X, PlusCircle, AlertCircle, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { AppNotification } from '@/lib/types';

export const NotificationBell: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);

  // Form State for Admin Send Notification
  const [sendTitle, setSendTitle] = useState('');
  const [sendMessage, setSendMessage] = useState('');
  const [sendType, setSendType] = useState<'new_movie' | 'info' | 'system'>('info');
  const [sendTargetUrl, setSendTargetUrl] = useState('');
  const [sending, setSending] = useState(false);
  const [sendSuccessMsg, setSendSuccessMsg] = useState('');
  const [sendErrorMsg, setSendErrorMsg] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const data = await api.getNotifications();
      const filtered = (data || []).filter((n: AppNotification) => {
        if (n.userId && currentUser?.id && n.userId !== currentUser.id) {
          return false;
        }
        return true;
      });
      setNotifications(filtered);
    } catch (err) {
      console.error('Failed to load notifications', err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await api.markNotificationsRead();
  };

  const handleDeleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await api.deleteNotification(id);
  };

  const handleClearAllNotifications = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setNotifications([]);
    await api.clearAllNotifications();
  };

  const handleNotificationClick = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setIsOpen(false);
  };

  const handleSendNotification = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSendErrorMsg('');
    setSendSuccessMsg('');

    if (!sendTitle.trim()) {
      setSendErrorMsg('សូមបញ្ចូលចំណងជើងសារ (Notification Title required)');
      return;
    }
    if (!sendMessage.trim()) {
      setSendErrorMsg('សូមបញ្ចូលខ្លឹមសារសារ (Message Content required)');
      return;
    }

    setSending(true);
    try {
      await api.sendNotification({
        title: sendTitle.trim(),
        message: sendMessage.trim(),
        type: sendType,
        targetUrl: sendTargetUrl.trim() || '/movies',
        createdAt: new Date().toISOString(),
      });
      setSendSuccessMsg('សារជូនដំណឹងត្រូវបានផ្ញើទៅកាន់អ្នកប្រើប្រាស់ទាំងអស់ដោយជោគជ័យ!');
      setSendTitle('');
      setSendMessage('');
      setSendTargetUrl('');
      await fetchNotifications();
      setTimeout(() => {
        setSendSuccessMsg('');
        setShowSendModal(false);
      }, 1500);
    } catch (err: any) {
      console.error('Failed to send notification', err);
      setSendErrorMsg(err?.message || 'បរាជ័យក្នុងការផ្ញើសារជូនដំណឹង');
    } finally {
      setSending(false);
    }
  };

  const modalContent = showSendModal ? (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 text-slate-900 animate-scale-up">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
            <Send className="w-5 h-5 text-brand-red" />
            <span>ផ្ញើសារជូនដំណឹងសកល (Send Broadcast)</span>
          </h3>
          <button
            type="button"
            onClick={() => {
              setShowSendModal(false);
              setSendErrorMsg('');
            }}
            className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {sendSuccessMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl text-xs font-bold animate-fade-in flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{sendSuccessMsg}</span>
          </div>
        )}

        {sendErrorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-bold animate-fade-in flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{sendErrorMsg}</span>
          </div>
        )}

        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              ចំណងជើងសារ (Notification Title) *
            </label>
            <input
              type="text"
              required
              placeholder="ឧ. ភាពយន្តភាគថ្មី 4K ត្រូវបានបន្ថែម..."
              value={sendTitle}
              onChange={(e) => setSendTitle(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:border-brand-red focus:bg-white focus:outline-none text-slate-900 font-medium"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              ខ្លឹមសារសារ (Message Content) *
            </label>
            <textarea
              required
              rows={3}
              placeholder="បញ្ចូលខ្លឹមសារសារជូនដំណឹងទៅកាន់អ្នកប្រើប្រាស់ទាំងអស់..."
              value={sendMessage}
              onChange={(e) => setSendMessage(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:border-brand-red focus:bg-white focus:outline-none text-slate-900 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                ប្រភេទសារ (Type)
              </label>
              <select
                value={sendType}
                onChange={(e) => setSendType(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold focus:border-brand-red focus:outline-none text-slate-900"
              >
                <option value="info">សារព័ត៌មាន (Info)</option>
                <option value="new_movie">ភាពយន្តថ្មី (New Movie)</option>
                <option value="system">ប្រព័ន្ធ (System)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Link URL (Optional)
              </label>
              <input
                type="text"
                placeholder="/movies"
                value={sendTargetUrl}
                onChange={(e) => setSendTargetUrl(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:border-brand-red focus:outline-none text-slate-900"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={() => {
                setShowSendModal(false);
                setSendErrorMsg('');
              }}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
            >
              បោះបង់ (Cancel)
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                handleSendNotification();
              }}
              disabled={sending}
              className="px-6 py-2.5 bg-brand-red hover:bg-red-700 text-white font-extrabold rounded-xl text-xs flex items-center space-x-1.5 shadow-md shadow-brand-red/20 disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{sending ? 'កំពុងផ្ញើ...' : 'ផ្ញើសារឥឡូវនេះ (Send Broadcast)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="relative" ref={dropdownRef} suppressHydrationWarning>
      {/* Bell Icon Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-full transition-all border border-slate-200 shadow-xs focus:outline-none"
        title="ដំណឹងសកល (Notifications)"
        suppressHydrationWarning
      >
        <Bell className="w-4 h-4 text-slate-700" />
        {mounted && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-brand-red text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Notification Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white border border-slate-200 rounded-3xl shadow-2xl z-50 overflow-hidden animate-fade-in text-slate-900">
          {/* Panel Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-extrabold text-slate-900">ការជូនដំណឹង ({notifications.length})</h3>
            </div>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-[11px] font-bold text-brand-red hover:underline flex items-center space-x-1"
                >
                  <Check className="w-3 h-3" />
                  <span>អានទាំងអស់</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllNotifications}
                  className="text-[11px] font-bold text-slate-400 hover:text-red-600 flex items-center space-x-1 transition-colors"
                  title="លុបសារទាំងអស់"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>លុបទាំងអស់</span>
                </button>
              )}
            </div>
          </div>

          {/* Admin Send Notification Action Banner */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setShowSendModal(true);
              }}
              className="w-full text-center py-2.5 bg-gradient-to-r from-red-600 via-brand-red to-red-700 text-white font-extrabold text-xs flex items-center justify-center space-x-2 transition-all hover:opacity-95 border-b border-red-800 shadow-sm cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-white animate-pulse" />
              <span>+ ផ្ញើសារជូនដំណឹងសកល (Send Notification)</span>
            </button>
          )}

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                មិនទាន់មានសារជូនដំណឹងនៅឡើយទេ
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="relative group">
                  <Link
                    href={n.targetUrl || '#'}
                    onClick={() => handleNotificationClick(n.id)}
                    className={`flex items-start space-x-3 p-3.5 pr-9 transition-colors text-xs ${
                      !n.read ? 'bg-red-50/50 hover:bg-red-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0 text-brand-red mt-0.5">
                      {n.type === 'new_movie' ? (
                        <Film className="w-4 h-4 text-brand-red" />
                      ) : (
                        <Info className="w-4 h-4 text-blue-600" />
                      )}
                    </div>

                    <div className="flex-grow min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <p className="font-extrabold text-slate-900 truncate">{n.title}</p>
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-brand-red flex-shrink-0 ml-2" />
                        )}
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed line-clamp-2">{n.message}</p>
                      <span className="text-[10px] text-slate-400 block pt-0.5 font-medium">
                        {new Date(n.createdAt).toLocaleDateString('km-KH', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </Link>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteNotification(e, n.id)}
                    className="absolute right-2.5 top-3.5 p-1 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="លុបសារនេះ"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Portal Modal Overlay on document.body */}
      {mounted && modalContent && createPortal(modalContent, document.body)}
    </div>
  );
};


