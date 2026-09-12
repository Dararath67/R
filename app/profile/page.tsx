'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { UserLayout } from '@/components/user/UserLayout';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { api } from '@/lib/api';
import { Mail, ShieldCheck, Heart, History, LogOut, Camera, User as UserIcon, Save, Edit3, CheckCircle, Copy, Key, MessageSquare, UploadCloud, Clock, CheckCircle2, XCircle } from 'lucide-react';

export default function ProfilePage() {
  const { currentUser, isAuthenticated, logout, updateProfile } = useAuth();
  const { movies } = useData();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [avatar, setAvatar] = useState(currentUser?.avatar || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopyId = () => {
    if (currentUser?.id) {
      navigator.clipboard.writeText(currentUser.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  if (!isAuthenticated || !currentUser) {
    return (
      <UserLayout>
        <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">សូមចូលប្រើប្រាស់គណនី (Please Sign In)</h2>
          <p className="text-slate-500">អ្នកត្រូវតែចូលប្រើប្រាស់គណនីដើម្បីមើលទំព័រព័ត៌មានផ្ទាល់ខ្លួន។</p>
          <Link href="/login" className="inline-block bg-brand-red text-white px-6 py-2.5 rounded-xl font-bold shadow-md">
            ចូលប្រើប្រាស់ (Sign In)
          </Link>
        </div>
      </UserLayout>
    );
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const res = await api.uploadImage(file);
      if (res?.url) {
        setAvatar(res.url);
      }
    } catch (err) {
      console.error('Avatar upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');

    try {
      const ok = await updateProfile({ name: name.trim(), email: email.trim(), avatar });
      if (ok) {
        setSuccessMsg('បានរក្សាទុកព័ត៌មានដោយជោគជ័យ!');
        setIsEditing(false);
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <UserLayout>
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
        {/* Success Alert Banner */}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl text-xs font-bold flex items-center space-x-2 shadow-sm animate-fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-8 shadow-sm">
          {/* Top Avatar & User Main Details */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 text-center sm:text-left">
              {/* Avatar Image with Upload Icon Button */}
              <div className="relative group">
                <img
                  src={avatar || currentUser.avatar}
                  alt={currentUser.name}
                  className="w-24 h-24 rounded-full object-cover ring-4 ring-brand-red/20 shadow-md bg-slate-100"
                />
                <label className="absolute bottom-0 right-0 bg-brand-red text-white p-2 rounded-full shadow-md cursor-pointer hover:bg-brand-crimson transition-transform group-hover:scale-110">
                  <Camera className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
                {uploading && (
                  <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                    Uploading...
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <h1 className="text-2xl font-black text-slate-900">{currentUser.name}</h1>
                <p className="text-sm text-slate-500 font-medium flex items-center justify-center sm:justify-start space-x-1.5">
                  <Mail className="w-4 h-4 text-brand-red" />
                  <span>{currentUser.email}</span>
                </p>
                <div className="flex items-center justify-center sm:justify-start space-x-2 pt-1 flex-wrap gap-1.5">
                  <span className="text-xs font-mono bg-red-50 text-brand-red border border-red-200 px-3 py-1 rounded-full font-black flex items-center space-x-1">
                    <Key className="w-3.5 h-3.5 text-brand-red" />
                    <span>ID: {currentUser.id}</span>
                  </span>
                  <span className="text-xs bg-amber-50 border border-amber-200 px-3 py-1 rounded-full text-amber-800 font-bold flex items-center space-x-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                    <span>Role: {currentUser.role}</span>
                  </span>
                  <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full font-bold">
                    Status: {currentUser.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Toggle Edit Button */}
            <button
              onClick={() => {
                setName(currentUser.name);
                setEmail(currentUser.email);
                setAvatar(currentUser.avatar);
                setIsEditing(!isEditing);
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center space-x-1.5 transition-all self-center sm:self-start"
            >
              <Edit3 className="w-4 h-4" />
              <span>{isEditing ? 'បោះបង់ការកែប្រែ' : 'កែប្រែ Profile'}</span>
            </button>
          </div>

          {/* Edit Form (Collapsible) */}
          {isEditing && (
            <form onSubmit={handleSaveProfile} className="bg-slate-50 border border-slate-200 p-6 rounded-2xl space-y-4 text-xs animate-fade-in">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2">
                កែប្រែព័ត៌មានផ្ទាល់ខ្លួន
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    ឈ្មោះបង្ហាញ (Display Name)
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl py-2.5 px-3.5 text-sm focus:outline-none focus:border-brand-red"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    អាសយដ្ឋានអ៊ីមែល (Email)
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl py-2.5 px-3.5 text-sm focus:outline-none focus:border-brand-red"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  រូបភាព Avatar URL (ឬ Upload រូបខាងលើ)
                </label>
                <input
                  type="text"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl py-2.5 px-3.5 text-sm focus:outline-none focus:border-brand-red"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-brand-red hover:bg-brand-crimson text-white font-bold text-xs rounded-xl shadow-md flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'កំពុងរក្សាទុក...' : 'រក្សាទុកការកែប្រែ'}</span>
                </button>
              </div>
            </form>
          )}

          {/* User ID Card for Chat Search */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl space-y-3 shadow-lg border border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-brand-red" />
                  <span>អត្តសញ្ញាណរបស់អ្នកប្រើប្រាស់ (User ID)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  សមាជិកផ្សេងទៀតអាចវាយបញ្ចូល ID នេះក្នុងទំព័រឆាត ដើម្បីស្វែងរក និងផ្ញើសារមកកាន់អ្នក។
                </p>
              </div>

              <div className="flex items-center space-x-2 bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800 font-mono text-sm font-black text-brand-red flex-shrink-0">
                <span>{currentUser.id}</span>
                <button
                  onClick={handleCopyId}
                  className="p-1 text-slate-400 hover:text-white transition rounded"
                  title="Copy User ID"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            {copied && (
              <span className="text-xs text-emerald-400 font-bold block animate-fade-in">
                បានចម្លង User ID រួចរាល់ហើយ! (User ID copied)
              </span>
            )}
          </div>

          {/* My Uploaded Videos Status Tracker */}
          {(() => {
            const myUploadedMovies = movies.filter((m) => m.uploadedByUserId === currentUser.id);
            return (
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                    <UploadCloud className="w-5 h-5 text-brand-red" />
                    <span>វីដេអូបាន Upload របស់ខ្ញុំ ({myUploadedMovies.length})</span>
                  </h3>
                </div>

                {myUploadedMovies.length === 0 ? (
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs text-slate-500 font-medium">
                    អ្នកមិនទាន់បាន Upload វីដេអូណាមួយនៅឡើយទេ
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {myUploadedMovies.map((m) => {
                      const isApproved = m.isPublished && m.approvalStatus !== 'pending';
                      const isRejected = m.approvalStatus === 'rejected';

                      return (
                        <div
                          key={m.id}
                          className="flex items-center space-x-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-slate-100 transition-all"
                        >
                          <img
                            src={m.posterUrl}
                            alt={m.title}
                            className="w-12 h-16 object-cover rounded-xl shadow-xs shrink-0"
                          />
                          <div className="flex-1 min-w-0 space-y-1">
                            <h4 className="text-xs font-black text-slate-900 truncate">{m.title}</h4>
                            <p className="text-[10px] text-slate-500 font-mono">
                              ថ្ងៃផ្ញើ: {m.createdAt ? new Date(m.createdAt).toLocaleDateString('km-KH', { year: 'numeric', month: 'short', day: 'numeric' }) : 'មិនមាន'}
                            </p>
                            <div className="pt-0.5">
                              {isApproved ? (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>បានអនុម័ត (Approved)</span>
                                </span>
                              ) : isRejected ? (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-800 border border-red-300">
                                  <XCircle className="w-3 h-3 text-red-600" />
                                  <span>បានបដិសេធ (Rejected)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  <span>រង់ចាំ Admin ពិនិត្យ (Pending)</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* User Watch Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
            <Link
              href="/favorites"
              className="bg-slate-50 p-5 rounded-2xl border border-slate-200 hover:border-brand-red flex items-center space-x-4 transition-all group"
            >
              <div className="p-3.5 bg-red-100 text-brand-red rounded-2xl group-hover:scale-110 transition-transform">
                <Heart className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">{currentUser.favorites.length}</p>
                <p className="text-xs text-slate-500 font-bold">ភាពយន្តក្នុងបញ្ជីចូលចិត្ត</p>
              </div>
            </Link>

            <Link
              href="/history"
              className="bg-slate-50 p-5 rounded-2xl border border-slate-200 hover:border-brand-red flex items-center space-x-4 transition-all group"
            >
              <div className="p-3.5 bg-blue-100 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform">
                <History className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">{currentUser.history.length}</p>
                <p className="text-xs text-slate-500 font-bold">វីដេអូធ្លាប់បានមើល</p>
              </div>
            </Link>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={logout}
              className="px-6 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-2xl text-xs font-bold hover:bg-red-600 hover:text-white transition-all flex items-center space-x-2"
            >
              <LogOut className="w-4 h-4" />
              <span>ចាកចេញពីគណនី (Sign Out)</span>
            </button>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}
