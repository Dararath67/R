'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useData } from '@/context/DataContext';
import { api } from '@/lib/api';
import { Users, Search, Ban, CheckCircle, Trash2, Eye, History, X, KeyRound, Lock, ShieldCheck, AlertCircle } from 'lucide-react';
import { User } from '@/lib/types';

export default function AdminUsersPage() {
  const { users, fetchUsers, toggleBanUser, deleteUser, movies, series } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Custom Confirm Modal State
  const [userModal, setUserModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'យល់ព្រម',
    onConfirm: () => {},
  });

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
    fetchUsers();
  }, []);

  // Password reset modal state
  const [passwordModalUser, setPasswordModalUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const allContent = [...movies, ...series];

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser) return;
    setPasswordMsg('');
    setPasswordError('');

    if (!newPassword) {
      setPasswordError('សូមបញ្ចូលលេខសម្ងាត់ថ្មី (New password required)');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('លេខសម្ងាត់ផ្ទៀងផ្ទាត់មិនត្រូវគ្នាទេ (Passwords do not match)');
      return;
    }

    setSavingPassword(true);
    try {
      await api.changePassword(passwordModalUser.id, undefined, newPassword);
      setPasswordMsg(`បានប្តូរលេខសម្ងាត់សម្រាប់ ${passwordModalUser.name} ដោយជោគជ័យ!`);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setPasswordMsg('');
        setPasswordModalUser(null);
      }, 2500);
    } catch (err: any) {
      setPasswordError(err.message || 'ការប្តូរលេខសម្ងាត់បរាជ័យ');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center space-x-3">
              <Users className="w-7 h-7 text-emerald-600" />
              <span>គ្រប់គ្រងអ្នកប្រើប្រាស់ (User Management)</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              ស្វែងរកអ្នកប្រើប្រាស់, ផ្អាកគណនី, កែប្រែលេខសម្ងាត់ និងពិនិត្យមើលប្រវត្តិទស្សនា។
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div className="relative w-full max-w-md">
            <input
              type="text"
              placeholder="ស្វែងរកអ្នកប្រើប្រាស់តាមឈ្មោះ ឬអ៊ីមែល..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 text-xs text-slate-900 placeholder-slate-400 rounded-xl py-2.5 pl-9 pr-4 border border-slate-200 focus:outline-none focus:border-brand-red focus:bg-white"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          </div>
          <span className="text-xs text-slate-500 font-bold hidden sm:inline">
            អ្នកប្រើប្រាស់សរុប: {filteredUsers.length}
          </span>
        </div>

        {/* Users Table & Mobile Cards */}
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          {/* Desktop Table View (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-mono border-b border-slate-200">
                <tr>
                  <th className="p-4">អ្នកប្រើប្រាស់</th>
                  <th className="p-4">តួនាទី</th>
                  <th className="p-4">កាលបរិច្ឆេទចុះឈ្មោះ</th>
                  <th className="p-4">ចំនួនប្រវត្តិទស្សនា</th>
                  <th className="p-4">ស្ថានភាព</th>
                  <th className="p-4 text-right">សកម្មភាព</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 flex items-center space-x-3">
                      <img
                        src={u.avatar}
                        alt={u.name}
                        className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-200"
                      />
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{u.name}</p>
                        <p className="text-[10px] text-slate-500 font-medium">{u.email}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          u.role === 'ADMIN'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 font-mono font-semibold">{u.createdAt}</td>
                    <td className="p-4 font-mono text-slate-700 font-bold">
                      {u.history ? u.history.length : 0} items
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center space-x-1 w-fit ${
                          u.status === 'banned'
                            ? 'bg-amber-400 text-amber-950 border border-amber-500 shadow-sm'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {u.status === 'banned' ? <Ban className="w-3 h-3 text-amber-950" /> : <CheckCircle className="w-3 h-3 text-emerald-600" />}
                        <span>{u.status === 'banned' ? 'ផ្អាកគណនី' : 'សកម្ម'}</span>
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      {/* Toggle VIP Status Button */}
                      <button
                        onClick={async () => {
                          try {
                            await api.toggleUserVip(u.id);
                            fetchUsers();
                          } catch (err: any) {
                            showAlert('បរាជ័យ', err.message || 'បរាជ័យក្នុងការប្តូរ VIP');
                          }
                        }}
                        className={`p-2 rounded-xl border transition-colors ${
                          (u as any).isVip
                            ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-sm'
                            : 'bg-slate-100 hover:bg-amber-100 text-slate-600 border-slate-200'
                        }`}
                        title={(u as any).isVip ? 'ដកសិទ្ធិ VIP' : 'ផ្ដល់សិទ្ធិ VIP'}
                      >
                        <ShieldCheck className="w-4 h-4" />
                      </button>

                      {/* Change User Password Button */}
                      <button
                        onClick={() => {
                          setPasswordModalUser(u);
                          setNewPassword('');
                          setConfirmPassword('');
                          setPasswordMsg('');
                          setPasswordError('');
                        }}
                        className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors"
                        title="កែប្រែលេខសម្ងាត់អ្នកប្រើប្រាស់ (Change Password)"
                      >
                        <KeyRound className="w-4 h-4 text-amber-700" />
                      </button>

                      <button
                        onClick={() => setSelectedUser(u)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
                        title="មើលព័ត៌មានលម្អិត"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleBanUser(u.id)}
                        className={`p-2 rounded-xl border transition-colors ${
                          u.status === 'banned'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                        title={u.status === 'banned' ? 'បើកដំណើរការឡើងវិញ' : 'ផ្អាកគណនី'}
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setUserModal({
                            isOpen: true,
                            title: 'លុបអ្នកប្រើប្រាស់? (Delete User)',
                            message: `តើអ្នកពិតជាចង់លុបអ្នកប្រើប្រាស់ "${u.name}" ជាអចិន្ត្រៃយ៍មែនទេ?`,
                            confirmText: 'លុបអ្នកប្រើប្រាស់ (Delete)',
                            onConfirm: () => {
                              deleteUser(u.id);
                              setUserModal((prev) => ({ ...prev, isOpen: false }));
                            },
                          });
                        }}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-red-50 text-red-600"
                        title="លុបអ្នកប្រើប្រាស់"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View (< md) */}
          <div className="block md:hidden divide-y divide-slate-100">
            {filteredUsers.map((u) => (
              <div key={u.id} className="p-4 space-y-3 bg-white">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-3 min-w-0">
                    <img
                      src={u.avatar}
                      alt={u.name}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-200 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-sm truncate">{u.name}</p>
                      <p className="text-[10px] text-slate-500 font-medium truncate">{u.email}</p>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[9px] font-bold flex-shrink-0 ${
                      u.role === 'ADMIN'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}
                  >
                    {u.role}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 text-slate-500 font-medium">
                  <span>ចុះឈ្មោះ: <span className="font-mono text-slate-700 font-bold">{u.createdAt}</span></span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold flex items-center space-x-1 ${
                      u.status === 'banned'
                        ? 'bg-amber-400 text-amber-950 border border-amber-500 shadow-sm'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {u.status === 'banned' ? <Ban className="w-2.5 h-2.5 text-amber-950" /> : <CheckCircle className="w-2.5 h-2.5 text-emerald-600" />}
                    <span>{u.status === 'banned' ? 'ផ្អាកគណនី' : 'សកម្ម'}</span>
                  </span>
                </div>

                {/* Mobile Actions Toolbar */}
                <div className="flex items-center justify-between gap-1 pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-600">
                    ទស្សនា: <span className="font-mono text-brand-red">{u.history ? u.history.length : 0} items</span>
                  </span>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={async () => {
                        try {
                          await api.toggleUserVip(u.id);
                          fetchUsers();
                        } catch (err: any) {
                          showAlert('បរាជ័យ', err.message || 'បរាជ័យក្នុងការប្តូរ VIP');
                        }
                      }}
                      className={`p-1.5 rounded-xl border ${
                        (u as any).isVip
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-sm'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                      title={(u as any).isVip ? 'ដកសិទ្ធិ VIP' : 'ផ្ដល់សិទ្ធិ VIP'}
                    >
                      <ShieldCheck className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        setPasswordModalUser(u);
                        setNewPassword('');
                        setConfirmPassword('');
                        setPasswordMsg('');
                        setPasswordError('');
                      }}
                      className="p-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200"
                      title="កែប្រែលេខសម្ងាត់"
                    >
                      <KeyRound className="w-4 h-4 text-amber-700" />
                    </button>

                    <button
                      onClick={() => setSelectedUser(u)}
                      className="p-1.5 rounded-xl bg-slate-100 text-slate-700"
                      title="មើលប្រវត្តិ"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleBanUser(u.id)}
                      className={`p-1.5 rounded-xl border ${
                        u.status === 'banned'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                      title={u.status === 'banned' ? 'បើកដំណើរការ' : 'ផ្អាក'}
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setUserModal({
                          isOpen: true,
                          title: 'លុបអ្នកប្រើប្រាស់? (Delete User)',
                          message: `តើអ្នកពិតជាចង់លុបអ្នកប្រើប្រាស់ "${u.name}" ជាអចិន្ត្រៃយ៍មែនទេ?`,
                          confirmText: 'លុបអ្នកប្រើប្រាស់ (Delete)',
                          onConfirm: () => {
                            deleteUser(u.id);
                            setUserModal((prev) => ({ ...prev, isOpen: false }));
                          },
                        });
                      }}
                      className="p-1.5 rounded-xl bg-slate-100 text-red-600"
                      title="លុប"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Change User Password Modal */}
        {passwordModalUser && (
          <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex justify-center p-3 sm:p-4 animate-fade-in">
            <div className="fixed inset-0" onClick={() => setPasswordModalUser(null)} />
            <div className="relative z-10 w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 space-y-6 shadow-2xl m-auto max-h-[85vh] flex flex-col min-h-0 animate-scale-up">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shadow-sm shrink-0">
                    <KeyRound className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">ប្តូរលេខសម្ងាត់សម្រាប់អ្នកប្រើប្រាស់</h3>
                    <p className="text-xs text-slate-500 font-medium truncate max-w-[220px]">{passwordModalUser.name} ({passwordModalUser.email})</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPasswordModalUser(null)}
                  className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition cursor-pointer shrink-0"
                  title="បិទ (Close)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {passwordMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3.5 rounded-xl text-xs font-bold flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{passwordMsg}</span>
                </div>
              )}

              {passwordError && (
                <div className="bg-red-50 border border-red-200 text-red-600 p-3.5 rounded-xl text-xs font-bold">
                  {passwordError}
                </div>
              )}

              <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-xs overflow-y-auto flex-1 min-h-0 pr-1">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    លេខសម្ងាត់ថ្មី (New Password)
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-3 text-sm focus:border-brand-red focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    ផ្ទៀងផ្ទាត់លេខសម្ងាត់ថ្មី (Confirm New Password)
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-3 text-sm focus:border-brand-red focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setPasswordModalUser(null)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    បោះបង់
                  </button>
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center space-x-2 transition cursor-pointer disabled:opacity-50"
                  >
                    <Lock className="w-4 h-4" />
                    <span>{savingPassword ? 'កំពុងប្តូរ...' : 'រក្សាទុកលេខសម្ងាត់ថ្មី'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal View User Info */}
        {selectedUser && (
          <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex justify-center p-3 sm:p-4 animate-fade-in">
            <div className="fixed inset-0" onClick={() => setSelectedUser(null)} />
            <div className="relative z-10 w-full max-w-2xl bg-white border border-slate-200 rounded-3xl p-6 space-y-6 shadow-2xl m-auto max-h-[85vh] flex flex-col min-h-0 animate-scale-up">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
                <div className="flex items-center space-x-3">
                  <img
                    src={selectedUser.avatar}
                    alt={selectedUser.name}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-brand-red shrink-0"
                  />
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{selectedUser.name}</h3>
                    <p className="text-xs text-slate-500 font-medium">{selectedUser.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition cursor-pointer shrink-0"
                  title="បិទ (Close)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Watch History List */}
              <div className="space-y-3 overflow-y-auto flex-1 min-h-0 pr-1">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-2">
                  <History className="w-4 h-4 text-brand-red" />
                  <span>ប្រវត្តិទស្សនារបស់អ្នកប្រើប្រាស់ ({selectedUser.history?.length || 0})</span>
                </h4>

                {(!selectedUser.history || selectedUser.history.length === 0) ? (
                  <p className="text-xs text-slate-400 py-4 text-center">មិនទាន់មានប្រវត្តិទស្សនា</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {selectedUser.history.map((h) => {
                      const item = allContent.find((m) => m.id === h.contentId);
                      return (
                        <div
                          key={h.id}
                          className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex items-center justify-between text-xs"
                        >
                          <div>
                            <p className="font-bold text-slate-900">{item?.title || 'Unknown Title'}</p>
                            <p className="text-[10px] text-slate-500">
                              កាលបរិច្ឆេទទស្សនា: {new Date(h.watchedAt).toLocaleString()}
                            </p>
                          </div>
                          <span className="font-mono font-bold text-amber-600">{h.progress}% Progress</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CUSTOM CONFIRMATION MODAL PORTAL */}
        {userModal.isOpen && typeof window !== 'undefined' && createPortal(
          <div className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-sm sm:max-w-md w-full text-center space-y-5 shadow-2xl text-white transform transition-all animate-scale-in">
              <div className="relative inline-block">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto border bg-red-500/10 border-red-500/30 text-red-500">
                  <Trash2 className="w-8 h-8 text-red-500" />
                </div>
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-white">{userModal.title}</h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-2 font-medium leading-relaxed">
                  {userModal.message}
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setUserModal((prev) => ({ ...prev, isOpen: false }))}
                  className="flex-1 py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm transition cursor-pointer border border-slate-700"
                >
                  បោះបង់ (Cancel)
                </button>
                <button
                  type="button"
                  onClick={userModal.onConfirm}
                  className="flex-1 py-3 px-4 rounded-2xl text-white font-bold text-xs sm:text-sm transition shadow-lg cursor-pointer bg-red-600 hover:bg-red-700 shadow-red-600/30"
                >
                  {userModal.confirmText}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

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
    </AdminLayout>
  );
}
