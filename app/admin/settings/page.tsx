'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useData } from '@/context/DataContext';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { CustomBannerItem } from '@/lib/types';
import { AlertTriangle } from 'lucide-react';
import {
  Settings,
  Save,
  ShieldCheck,
  Sliders,
  Image as ImageIcon,
  Megaphone,
  Star,
  Eye,
  Upload,
  Trash2,
  Radio,
  Lock,
  KeyRound,
  CheckCircle2,
  Layers,
  Share2,
  Globe,
  Facebook,
  Twitter,
  Instagram,
  Github,
  Send,
  Smartphone,
  Bell,
  BellRing,
  ShieldAlert,
  Film,
  UserCheck,
} from 'lucide-react';

export default function AdminSettingsPage() {
  const { movies, series, bannerSettings, updateBannerSettings } = useData();
  const { currentUser } = useAuth();

  // Active Category Tab state
  const [activeTab, setActiveTab] = useState<'banner' | 'announcement' | 'notifications' | 'telegram' | 'app' | 'social' | 'security' | 'system' | 'sessions'>('banner');

  // Notification Alert Switch States
  const [enablePushNotifications, setEnablePushNotifications] = useState(
    bannerSettings.enablePushNotifications !== false
  );
  const [enableTelegramAlerts, setEnableTelegramAlerts] = useState(
    bannerSettings.enableTelegramAlerts !== false
  );
  const [enableSecurityAlerts, setEnableSecurityAlerts] = useState(
    bannerSettings.enableSecurityAlerts !== false
  );
  const [enableNewEpisodeAlerts, setEnableNewEpisodeAlerts] = useState(
    bannerSettings.enableNewEpisodeAlerts !== false
  );
  const [enableUserLoginAlerts, setEnableUserLoginAlerts] = useState(
    bannerSettings.enableUserLoginAlerts || false
  );
  const [requireLoginToWatch, setRequireLoginToWatch] = useState(
    bannerSettings.requireLoginToWatch !== false
  );

  // Password Change State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdError, setPwdError] = useState('');

  const allMovies = [...movies, ...series].filter((m) => m.isPublished);

  // Mobile App Section State
  const [showAppSection, setShowAppSection] = useState(
    bannerSettings.showAppSection !== false
  );
  const [appSectionTitle, setAppSectionTitle] = useState(
    bannerSettings.appSectionTitle || 'ទាញយកកម្មវិធី CineStream Mobile App'
  );
  const [appSectionSubtitle, setAppSectionSubtitle] = useState(
    bannerSettings.appSectionSubtitle ||
      'ទស្សនាភាពយន្ត និងរឿងភាគល្បីៗលើទូរស័ព្ទដៃ Android & iOS គ្រប់ពេលវេលា គុណភាព 4K Ultra HD'
  );
  const [androidAppUrl, setAndroidAppUrl] = useState(
    bannerSettings.androidAppUrl || 'https://play.google.com'
  );
  const [iosAppUrl, setIosAppUrl] = useState(
    bannerSettings.iosAppUrl || 'https://apple.com/app-store'
  );
  const [apkDownloadUrl, setApkDownloadUrl] = useState(
    bannerSettings.apkDownloadUrl || 'https://cinestream.app/download.apk'
  );

  // Social Media Links State
  const [facebookUrl, setFacebookUrl] = useState(bannerSettings.facebookUrl !== undefined ? bannerSettings.facebookUrl : 'https://facebook.com');
  const [twitterUrl, setTwitterUrl] = useState(bannerSettings.twitterUrl !== undefined ? bannerSettings.twitterUrl : 'https://twitter.com');
  const [instagramUrl, setInstagramUrl] = useState(bannerSettings.instagramUrl !== undefined ? bannerSettings.instagramUrl : 'https://instagram.com');
  const [githubUrl, setGithubUrl] = useState(bannerSettings.githubUrl !== undefined ? bannerSettings.githubUrl : 'https://github.com');
  const [tiktokUrl, setTiktokUrl] = useState(bannerSettings.tiktokUrl !== undefined ? bannerSettings.tiktokUrl : 'https://tiktok.com');
  const [telegramUrl, setTelegramUrl] = useState(bannerSettings.telegramUrl !== undefined ? bannerSettings.telegramUrl : 'https://t.me');

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'info';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showAlert = (title: string, message: string) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmText: 'យល់ព្រម',
      cancelText: '',
      onConfirm: () => {},
    });
  };

  // Banner State
  const [selectedMovieIds, setSelectedMovieIds] = useState<string[]>(
    bannerSettings.featuredMovieIds || (bannerSettings.featuredMovieId ? [bannerSettings.featuredMovieId] : [])
  );
  const [customBanners, setCustomBanners] = useState<CustomBannerItem[]>(
    bannerSettings.customBanners || []
  );
  const [customHeadline, setCustomHeadline] = useState(bannerSettings.customHeadline || '');
  const [customSubtitle, setCustomSubtitle] = useState(bannerSettings.customSubtitle || '');
  const [customBannerUrl, setCustomBannerUrl] = useState(bannerSettings.customBannerUrl || '');
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState(
    bannerSettings.announcementTitle || ''
  );
  const [announcementText, setAnnouncementText] = useState(
    bannerSettings.announcementText || ''
  );
  const [announcementDate, setAnnouncementDate] = useState(
    bannerSettings.announcementDate || ''
  );
  const [announcementColor, setAnnouncementColor] = useState<'red' | 'yellow' | 'blue' | 'dark'>(
    bannerSettings.announcementColor || 'red'
  );
  const [showAnnouncement, setShowAnnouncement] = useState(
    bannerSettings.showAnnouncement !== false
  );

  const handleDeleteAnnouncement = async () => {
    setAnnouncementTitle('');
    setAnnouncementText('');
    setShowAnnouncement(false);
    const updated = {
      ...bannerSettings,
      announcementTitle: '',
      announcementText: '',
      showAnnouncement: false,
    };
    await updateBannerSettings(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // System Settings State
  const [siteName, setSiteName] = useState(
    bannerSettings.siteName || 'CineStream Movie Portal'
  );
  const [maintenanceMode, setMaintenanceMode] = useState(
    bannerSettings.maintenanceMode || false
  );
  const [defaultQuality, setDefaultQuality] = useState(
    bannerSettings.defaultQuality || '4K'
  );
  const [maxBitrate, setMaxBitrate] = useState(
    bannerSettings.maxBitrate || '12000 kbps'
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync form state when bannerSettings loads
  React.useEffect(() => {
    if (bannerSettings) {
      if (bannerSettings.featuredMovieIds) {
        setSelectedMovieIds(bannerSettings.featuredMovieIds);
      } else if (bannerSettings.featuredMovieId) {
        setSelectedMovieIds([bannerSettings.featuredMovieId]);
      }
      if (bannerSettings.customBanners) setCustomBanners(bannerSettings.customBanners);
      if (bannerSettings.customHeadline !== undefined) setCustomHeadline(bannerSettings.customHeadline);
      if (bannerSettings.customSubtitle !== undefined) setCustomSubtitle(bannerSettings.customSubtitle);
      if (bannerSettings.customBannerUrl !== undefined) setCustomBannerUrl(bannerSettings.customBannerUrl);
      if (bannerSettings.announcementTitle !== undefined) setAnnouncementTitle(bannerSettings.announcementTitle);
      if (bannerSettings.announcementText !== undefined) setAnnouncementText(bannerSettings.announcementText);
      if (bannerSettings.announcementDate !== undefined) setAnnouncementDate(bannerSettings.announcementDate);
      if (bannerSettings.announcementColor !== undefined) setAnnouncementColor(bannerSettings.announcementColor);
      if (bannerSettings.showAnnouncement !== undefined) setShowAnnouncement(bannerSettings.showAnnouncement);
      if (bannerSettings.facebookUrl !== undefined) setFacebookUrl(bannerSettings.facebookUrl);
      if (bannerSettings.twitterUrl !== undefined) setTwitterUrl(bannerSettings.twitterUrl);
      if (bannerSettings.instagramUrl !== undefined) setInstagramUrl(bannerSettings.instagramUrl);
      if (bannerSettings.githubUrl !== undefined) setGithubUrl(bannerSettings.githubUrl);
      if (bannerSettings.telegramUrl !== undefined) setTelegramUrl(bannerSettings.telegramUrl);
      if (bannerSettings.tiktokUrl !== undefined) setTiktokUrl(bannerSettings.tiktokUrl);
      if (bannerSettings.showAppSection !== undefined) setShowAppSection(bannerSettings.showAppSection);
      if (bannerSettings.appSectionTitle !== undefined) setAppSectionTitle(bannerSettings.appSectionTitle);
      if (bannerSettings.appSectionSubtitle !== undefined) setAppSectionSubtitle(bannerSettings.appSectionSubtitle);
      if (bannerSettings.androidAppUrl !== undefined) setAndroidAppUrl(bannerSettings.androidAppUrl);
      if (bannerSettings.iosAppUrl !== undefined) setIosAppUrl(bannerSettings.iosAppUrl);
      if (bannerSettings.apkDownloadUrl !== undefined) setApkDownloadUrl(bannerSettings.apkDownloadUrl);
      if (bannerSettings.siteName !== undefined) setSiteName(bannerSettings.siteName);
      if (bannerSettings.maintenanceMode !== undefined) setMaintenanceMode(bannerSettings.maintenanceMode);
      if (bannerSettings.defaultQuality !== undefined) setDefaultQuality(bannerSettings.defaultQuality);
      if (bannerSettings.maxBitrate !== undefined) setMaxBitrate(bannerSettings.maxBitrate);
      if (bannerSettings.enablePushNotifications !== undefined) setEnablePushNotifications(bannerSettings.enablePushNotifications);
      if (bannerSettings.enableTelegramAlerts !== undefined) setEnableTelegramAlerts(bannerSettings.enableTelegramAlerts);
      if (bannerSettings.enableSecurityAlerts !== undefined) setEnableSecurityAlerts(bannerSettings.enableSecurityAlerts);
      if (bannerSettings.enableNewEpisodeAlerts !== undefined) setEnableNewEpisodeAlerts(bannerSettings.enableNewEpisodeAlerts);
      if (bannerSettings.enableUserLoginAlerts !== undefined) setEnableUserLoginAlerts(bannerSettings.enableUserLoginAlerts);
      if (bannerSettings.requireLoginToWatch !== undefined) setRequireLoginToWatch(bannerSettings.requireLoginToWatch);
    }
  }, [bannerSettings]);

  const toggleMovieSelection = (id: string) => {
    setSelectedMovieIds((prev) => {
      let updated: string[];
      if (prev.includes(id)) {
        updated = prev.filter((mId) => mId !== id);
      } else {
        if (prev.length >= 6) {
          showAlert('កំណត់ព្រំដែន', 'អាចជ្រើសរើសភាពយន្ត Hero Banner អតិបរមាត្រឹម ៦ ភាពយន្តប៉ុណ្ណោះ (Maximum 6 Featured Movies allowed)');
          return prev;
        }
        updated = [...prev, id];
      }
      updateBannerSettings({
        featuredMovieIds: updated,
        featuredMovieId: updated[0] || '',
      });
      return updated;
    });
  };

  const handleUploadNewCustomBanner = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (customBanners.length >= 6) {
      showAlert('កំណត់ព្រំដែន', 'អាច Upload រូបភាព Hero Banner អតិបរមាត្រឹម ៦ រូបភាពប៉ុណ្ណោះ (Maximum 6 Photo Banners allowed)');
      return;
    }

    setUploadingBanner(true);
    try {
      let url = '';
      try {
        const res = await api.uploadImage(file);
        if (res.url) url = res.url;
      } catch (err) {
        url = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve((event.target?.result as string) || '');
          reader.readAsDataURL(file);
        });
      }

      if (url) {
        const newItem: CustomBannerItem = {
          id: 'b-' + Date.now(),
          imageUrl: url,
          title: '',
          subtitle: '',
        };
        const updated = [...customBanners, newItem];
        setCustomBanners(updated);
        updateBannerSettings({ customBanners: updated });
      }
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleDeleteCustomBanner = (id: string) => {
    const updated = customBanners.filter((item) => item.id !== id);
    setCustomBanners(updated);
    updateBannerSettings({ customBanners: updated });
  };

  const handleUpdateCustomBannerText = (id: string, title: string, subtitle: string) => {
    const updated = customBanners.map((item) =>
      item.id === id ? { ...item, title, subtitle } : item
    );
    setCustomBanners(updated);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateBannerSettings({
      featuredMovieIds: selectedMovieIds,
      featuredMovieId: selectedMovieIds[0] || '',
      customBanners,
      customHeadline,
      customSubtitle,
      customBannerUrl,
      announcementTitle,
      announcementText,
      announcementDate: announcementDate || new Date().toLocaleString(),
      announcementColor,
      showAnnouncement,
      facebookUrl,
      twitterUrl,
      instagramUrl,
      githubUrl,
      telegramUrl,
      tiktokUrl,
      showAppSection,
      appSectionTitle,
      appSectionSubtitle,
      androidAppUrl,
      iosAppUrl,
      apkDownloadUrl,
      siteName,
      maintenanceMode,
      defaultQuality,
      maxBitrate,
      enablePushNotifications,
      enableTelegramAlerts,
      enableSecurityAlerts,
      enableNewEpisodeAlerts,
      enableUserLoginAlerts,
      requireLoginToWatch,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg('');
    setPwdError('');

    if (!newPassword) {
      setPwdError('សូមបញ្ចូលលេខសម្ងាត់ថ្មី (Password required)');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError('លេខសម្ងាត់ផ្ទៀងផ្ទាត់មិនត្រូវគ្នាទេ (Passwords do not match)');
      return;
    }

    setPwdSaving(true);
    try {
      await api.changePassword(currentUser?.id || 'admin', oldPassword, newPassword);
      setPwdMsg('បានផ្លាស់ប្តូរលេខសម្ងាត់ Admin ដោយជោគជ័យ! (Password changed successfully)');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPwdMsg(''), 4000);
    } catch (err: any) {
      setPwdError(err.message || 'ការផ្លាស់ប្តូរលេខសម្ងាត់បរាជ័យ');
    } finally {
      setPwdSaving(false);
    }
  };

  // Telegram Bot Credentials State
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [tgMsg, setTgMsg] = useState('');
  const [tgError, setTgError] = useState('');
  const [tgSaving, setTgSaving] = useState(false);
  const [tgTesting, setTgTesting] = useState(false);

  // DB Backup & Restore State
  const [restoreMsg, setRestoreMsg] = useState('');
  const [restoreError, setRestoreError] = useState('');
  const [restoreLoading, setRestoreLoading] = useState(false);

  React.useEffect(() => {
    api.getTelegramSettings().then((res) => {
      if (res) {
        setTelegramBotToken(res.telegramBotToken || '');
        setTelegramChatId(res.telegramChatId || '');
      }
    });
  }, []);

  const handleSaveTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    setTgMsg('');
    setTgError('');
    setTgSaving(true);
    try {
      await api.saveTelegramSettings(telegramBotToken, telegramChatId);
      setTgMsg('បានរក្សាទុក Telegram Bot Token & Chat ID រួចរាល់! (Saved successfully)');
      setTimeout(() => setTgMsg(''), 4000);
    } catch (err: any) {
      setTgError(err.message || 'បរាជ័យក្នុងការរក្សាទុក');
    } finally {
      setTgSaving(false);
    }
  };

  const handleTestTelegram = async () => {
    setTgMsg('');
    setTgError('');
    setTgTesting(true);
    try {
      await api.testTelegramSettings(telegramBotToken, telegramChatId);
      setTgMsg('សារសាកល្បងត្រូវបានផ្ញើទៅ Telegram ដោយជោគជ័យ! (Test alert sent!)');
      setTimeout(() => setTgMsg(''), 4000);
    } catch (err: any) {
      setTgError(err.message || 'បរាជ័យក្នុងការផ្ញើសារសាកល្បង');
    } finally {
      setTgTesting(false);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      await api.downloadDatabaseBackup();
    } catch (err: any) {
      showAlert('បរាជ័យ', err.message || 'បរាជ័យក្នុងការទាញយក Backup');
    }
  };

  const handleRestoreDatabase = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setConfirmModal({
      isOpen: true,
      title: 'បញ្ជាក់ការ Restore Database',
      message: 'តើអ្នកពិតជាចង់ Restore ទិន្នន័យ Database នេះមែនទេ? ទិន្នន័យចាស់នឹងត្រូវជំនួស។',
      confirmText: 'Restore ទិន្នន័យ',
      cancelText: 'បោះបង់',
      variant: 'danger',
      onConfirm: async () => {
        setRestoreMsg('');
        setRestoreError('');
        setRestoreLoading(true);
        try {
          await api.restoreDatabase(file);
          setRestoreMsg('ទិន្នន័យ Database ត្រូវបានទាញយកមកវិញដោយជោគជ័យ! (Database restored!)');
          setTimeout(() => setRestoreMsg(''), 5000);
        } catch (err: any) {
          setRestoreError(err.message || 'បរាជ័យក្នុងការ Restore Database');
        } finally {
          setRestoreLoading(false);
        }
      },
    });
  };

  // User Active Sessions State
  const [userSessions, setUserSessions] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const fetchUserSessions = async () => {
    setSessionsLoading(true);
    try {
      const data = await api.getUserSessions();
      setUserSessions(data || []);
    } catch {
      setUserSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'sessions') {
      fetchUserSessions();
    }
  }, [activeTab]);

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await api.revokeUserSession(sessionId);
      showAlert('ជោគជ័យ', 'បានលុបចោល Session / ផ្ដាច់ Device នេះដោយជោគជ័យ!');
      fetchUserSessions();
    } catch (err: any) {
      showAlert('បរាជ័យ', err.message || 'បរាជ័យក្នុងការលុប Session');
    }
  };

  const categoryTabs = [
    { id: 'banner', label: 'Hero Banner', icon: ImageIcon },
    { id: 'announcement', label: 'Announcement Bar', icon: Megaphone },
    { id: 'notifications', label: 'Notification Switch', icon: Bell },
    { id: 'telegram', label: 'Telegram Bot Alert', icon: Send },
    { id: 'app', label: 'Mobile App Download', icon: Smartphone },
    { id: 'social', label: 'Social Media Links', icon: Share2 },
    { id: 'sessions', label: 'Active User Sessions', icon: UserCheck },
    { id: 'security', label: 'Admin Security', icon: KeyRound },
    { id: 'system', label: 'System & Backup', icon: Sliders },
  ];

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Title */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center space-x-3">
              <Settings className="w-7 h-7 text-brand-red" />
              <span>ការកំណត់ប្រព័ន្ធតាមប្រភេទ (Settings Categories)</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              ជ្រើសរើសប្រភេទការកំណត់ខាងក្រោមដើម្បីកែប្រែទិន្នន័យតាមផ្នែកនីមួយៗ។
            </p>
          </div>
        </div>

        {savedSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-2xl text-xs flex items-center space-x-2 font-bold animate-fade-in">
            <ShieldCheck className="w-5 h-5 flex-shrink-0 text-emerald-600" />
            <span>បានរក្សាទុកការកំណត់រៀបរយហើយ!</span>
          </div>
        )}

        {/* Category Selector Navigation Bar */}
        <div className="flex items-center space-x-2 overflow-x-auto bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          {categoryTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-brand-red shadow-sm border border-slate-200/80 font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: HERO BANNER SETTINGS */}
        {activeTab === 'banner' && (
          <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                <ImageIcon className="w-5 h-5 text-brand-red" />
                <span>គ្រប់គ្រង Hero Banner (Featured Home Banner)</span>
              </h3>
              <span className="text-[10px] font-bold text-brand-red bg-red-50 border border-red-200 px-3 py-1 rounded-full uppercase tracking-wider">
                Category: Banner
              </span>
            </div>

            <div className="space-y-6 text-xs">
              {/* SECTION 1: Multi-Select Featured Movies for Hero Banner */}
              <div className="space-y-4 border-b border-slate-100 pb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block font-bold text-slate-900 uppercase tracking-wider text-xs">
                      ជ្រើសរើសភាពយន្តបង្ហាញលើ HERO BANNER (អាចជ្រើសរើសបាន ៤ ទៅ ៦ ភាពយន្ត - MULTI BANNER SELECTION) *
                    </label>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      ចុចលើភាពយន្តខាងក្រោមដើម្បីជ្រើសរើស/ដកចេញភាពយន្តដែលត្រូវបង្ហាញលើ Hero Banner (អាចជ្រើសរើសបាន ៤ ទៅ ៦ ភាពយន្ត)។
                    </p>
                  </div>
                  <span className="text-xs font-extrabold text-brand-red bg-red-50 border border-red-200 px-3 py-1 rounded-full flex-shrink-0">
                    ជ្រើសរើសបាន {selectedMovieIds.length} / 6 Banners
                  </span>
                </div>

                {allMovies.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center text-slate-500 text-xs">
                    មិនទាន់មានភាពយន្តក្នុងប្រព័ន្ធនៅឡើយទេ។ សូមបញ្ចូលភាពយន្តក្នុង Admin Panel មុននឹងជ្រើសរើសបង្ហាញលើ Banner។
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {allMovies.map((m) => {
                      const isSelected = selectedMovieIds.includes(m.id);
                      return (
                        <div
                          key={m.id}
                          onClick={() => toggleMovieSelection(m.id)}
                          className={`cursor-pointer rounded-2xl border p-3 flex items-center space-x-3 transition-all relative ${
                            isSelected
                              ? 'bg-red-50/80 border-brand-red ring-2 ring-brand-red/30 shadow-xs'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <img
                            src={m.posterUrl || m.backdropUrl}
                            alt={m.title}
                            className="w-12 h-16 object-cover rounded-xl border border-slate-200 flex-shrink-0"
                          />
                          <div className="min-w-0 flex-1 space-y-1">
                            <h5 className="font-extrabold text-slate-900 text-xs truncate">{m.title}</h5>
                            <p className="text-[10px] text-slate-500 font-medium">
                              {m.releaseYear} • ⭐ {m.rating} • {m.type === 'series' ? 'រឿងភាគ' : 'ភាពយន្ត'}
                            </p>
                            <span
                              className={`inline-block text-[9px] font-black px-2 py-0.5 rounded-full ${
                                isSelected
                                  ? 'bg-brand-red text-white'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                            >
                              {isSelected ? '✓ ជ្រើសរើសរួច' : '+ ជ្រើសរើស'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Top Action Header: Upload New Custom Banner Photo */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm flex items-center space-x-2">
                    <Upload className="w-4 h-4 text-brand-red" />
                    <span>ផ្ទុកឡើងរូបភាព HERO BANNER ផ្ទាល់ខ្លួន (CUSTOM BANNER PHOTO UPLOAD)</span>
                  </h4>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    ផ្ទុកឡើងរូបភាព Banner ផ្ទាល់ខ្លួនបានច្រើន (អាចជ្រើសរើសបាន ៥ ទៅ ៦ រូបភាព) ព្រមទាំងមានប៊ូតុងលុបចោល។
                  </p>
                </div>

                <label className="cursor-pointer bg-brand-red hover:bg-brand-crimson text-white font-extrabold px-5 py-3 rounded-2xl flex items-center space-x-2 text-xs shadow-md hover:scale-105 transition-all flex-shrink-0">
                  <Upload className="w-4 h-4" />
                  <span>{uploadingBanner ? 'កំពុងផ្ទុកឡើង...' : '+ ផ្ទុកឡើងរូបភាព Banner ថ្មី'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadNewCustomBanner}
                    disabled={uploadingBanner}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Uploaded Custom Banner Photos Gallery */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-800 uppercase tracking-wider">
                    បញ្ជីរូបភាព HERO BANNER ដែលបាន UPLOAD (UPLOADED BANNER PHOTOS GALLERY) *
                  </label>
                  <span className="text-xs font-extrabold text-brand-red bg-red-50 border border-red-200 px-3 py-1 rounded-full">
                    មានចំនួន {customBanners.length} / 6 Banners
                  </span>
                </div>

                {customBanners.length === 0 ? (
                  <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center space-y-3">
                    <div className="inline-flex p-3 rounded-2xl bg-red-50 text-brand-red">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">មិនទាន់មានរូបភាព Banner ដែលបាន Upload ទេ</h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      សូមចុចប៊ូតុងខាងលើដើម្បី <strong>+ ផ្ទុកឡើងរូបភាព Banner ថ្មី</strong> សម្រាប់បង្ហាញលើគេហទំព័រដើម។
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {customBanners.map((item, idx) => (
                      <div
                        key={item.id}
                        className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs space-y-3 relative group hover:border-brand-red/40 transition-all"
                      >
                        {/* Image Preview & Delete Button Bar */}
                        <div className="relative aspect-[16/7] w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-200">
                          <img
                            src={item.imageUrl}
                            alt={`Banner Photo ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

                          {/* Slide Badge */}
                          <span className="absolute top-3 left-3 bg-brand-red text-white text-[10px] font-black px-3 py-1 rounded-full shadow-md">
                            Banner #{idx + 1}
                          </span>

                          {/* DELETE BUTTON */}
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomBanner(item.id)}
                            className="absolute top-3 right-3 bg-red-600 hover:bg-red-700 text-white p-2.5 rounded-xl shadow-lg flex items-center space-x-1.5 text-xs font-bold transition-all duration-75 active:duration-0 ease-out transform active:scale-95 hover:scale-105"
                            title="លុបរូបភាព Banner នេះ (Delete Banner Photo)"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>លុប (Delete)</span>
                          </button>
                        </div>

                        {/* Optional Title & Subtitle inputs for custom banner */}
                        <div className="space-y-2 pt-1">
                          <input
                            type="text"
                            placeholder="ចំណងជើងរឿង/ Banner Title (Optional)..."
                            value={item.title || ''}
                            onChange={(e) =>
                              handleUpdateCustomBannerText(item.id, e.target.value, item.subtitle || '')
                            }
                            className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold rounded-xl p-2.5 focus:bg-white focus:border-brand-red focus:outline-none"
                          />
                          <input
                            type="text"
                            placeholder="ការពិពណ៌នា/ Banner Subtitle (Optional)..."
                            value={item.subtitle || ''}
                            onChange={(e) =>
                              handleUpdateCustomBannerText(item.id, item.title || '', e.target.value)
                            }
                            className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium rounded-xl p-2.5 focus:bg-white focus:border-brand-red focus:outline-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <input
                  type="text"
                  placeholder="ឬបញ្ចូល URL រូបភាព Banner (https://...)"
                  value={customBannerUrl}
                  onChange={(e) => setCustomBannerUrl(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl p-2.5 text-xs focus:border-brand-red focus:outline-none"
                />
              </div>

              {/* Custom Headline & Subtitle */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 uppercase tracking-wider">
                  ចំណងជើងជំនួស (Headline Override)
                </label>
                <input
                  type="text"
                  placeholder="ទុកទទេដើម្បីប្រើចំណងជើងភាពយន្តដើម..."
                  value={customHeadline}
                  onChange={(e) => setCustomHeadline(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-3 text-sm focus:border-brand-red focus:bg-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 uppercase tracking-wider">
                  ការពិពណ៌នាជំនួស (Subtitle Override)
                </label>
                <input
                  type="text"
                  placeholder="ទុកទទេដើម្បីប្រើការពិពណ៌នាភាពយន្តដើម..."
                  value={customSubtitle}
                  onChange={(e) => setCustomSubtitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-3 text-sm focus:border-brand-red focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="px-8 py-3.5 bg-brand-red hover:bg-brand-crimson text-white font-extrabold rounded-2xl shadow-lg shadow-brand-red/30 flex items-center space-x-2 text-sm transition-all hover:scale-105"
              >
                <Save className="w-5 h-5" />
                <span>រក្សាទុក Hero Banner</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: ANNOUNCEMENT BAR SETTINGS */}
        {activeTab === 'announcement' && (
          <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                <Megaphone className="w-5 h-5 text-amber-600" />
                <span>សារជូនដំណឹងខាងលើ (Header Announcement Bar)</span>
              </h3>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full uppercase tracking-wider">
                Category: Announcement
              </span>
            </div>

            <div className="space-y-4 text-xs">
              {/* LIVE ANNOUNCEMENT PREVIEW */}
              {showAnnouncement && (
                <div
                  className={`w-full rounded-[2rem] p-4 sm:p-5 shadow-lg flex items-center gap-3.5 transition-all relative overflow-hidden border border-white/10 ${
                    announcementColor === 'yellow'
                      ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-slate-950'
                      : announcementColor === 'blue'
                      ? 'bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 text-white'
                      : announcementColor === 'dark'
                      ? 'bg-gradient-to-r from-slate-900 via-slate-950 to-black text-white border-slate-800'
                      : 'bg-gradient-to-r from-red-700 via-brand-red to-red-900 text-white'
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-black/20 backdrop-blur-md flex items-center justify-center flex-shrink-0 border border-white/20 shadow-inner">
                    <Radio className="w-6 h-6 text-white animate-pulse" />
                  </div>

                  <div className="space-y-1 flex-grow min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="bg-white text-brand-red text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        {announcementTitle || 'SYSTEM ANNOUNCEMENT'}
                      </span>
                      <span className="text-[10px] text-white/80 font-mono">
                        {announcementDate || new Date().toLocaleString()}
                      </span>
                    </div>

                    <h4 className="text-base font-black text-white truncate">
                      {announcementTitle || 'Hallo'}
                    </h4>
                    <p className="text-xs text-white/90 font-medium truncate">
                      {announcementText || 'Halo'}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-700 uppercase tracking-wider">
                    ចំណងជើងសារ (Announcement Title)
                  </label>
                  <input
                    type="text"
                    placeholder="ឧ. Hallo"
                    value={announcementTitle}
                    onChange={(e) => setAnnouncementTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-3 text-sm focus:border-brand-red focus:bg-white focus:outline-none font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-700 uppercase tracking-wider">
                    ពណ៌ Theme (Banner Color Type) *
                  </label>
                  <select
                    value={announcementColor}
                    onChange={(e) => setAnnouncementColor(e.target.value as 'red' | 'yellow' | 'blue' | 'dark')}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold rounded-xl p-3 text-sm focus:border-brand-red focus:bg-white focus:outline-none"
                  >
                    <option value="red">ពណ៌ក្រហម (Red Theme)</option>
                    <option value="yellow">ពណ៌លឿង (Yellow Theme)</option>
                    <option value="blue">ពណ៌ខៀវ (Blue Theme)</option>
                    <option value="dark">ពណ៌ខ្មៅ (Dark Theme)</option>
                  </select>
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <label className="block font-bold text-slate-700 uppercase tracking-wider">
                    ខ្លឹមសារសារជូនដំណឹង (Announcement Content / Body)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="ឧ. Halo..."
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-3 text-sm focus:border-brand-red focus:bg-white focus:outline-none font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <input
                  type="checkbox"
                  id="showNotice"
                  checked={showAnnouncement}
                  onChange={(e) => setShowAnnouncement(e.target.checked)}
                  className="w-4 h-4 accent-brand-red rounded"
                />
                <label htmlFor="showNotice" className="text-sm font-bold text-slate-800 cursor-pointer">
                  បង្ហាញសារជូនដំណឹងនេះលើក្បាលគេហទំព័រដើម (Enable Announcement Bar)
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={handleDeleteAnnouncement}
                className="px-6 py-3.5 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600 font-extrabold rounded-2xl border border-slate-200 hover:border-red-200 flex items-center space-x-2 text-sm transition-all hover:scale-105"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
                <span>លុប/ផ្អាកសារ (Delete/Clear Notice)</span>
              </button>
              <button
                type="submit"
                className="px-8 py-3.5 bg-brand-red hover:bg-brand-crimson text-white font-extrabold rounded-2xl shadow-lg shadow-brand-red/30 flex items-center space-x-2 text-sm transition-all hover:scale-105"
              >
                <Save className="w-5 h-5" />
                <span>រក្សាទុកសារជូនដំណឹង</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB: NOTIFICATION ALERT SWITCH SETTINGS */}
        {activeTab === 'notifications' && (
          <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                <BellRing className="w-5 h-5 text-brand-red animate-bounce" />
                <span>ការកំណត់ប្រព័ន្ធផ្ញើសារជូនដំណឹង (Notification Alert Switches)</span>
              </h3>
              <span className="text-[10px] font-bold text-brand-red bg-red-50 border border-red-200 px-3 py-1 rounded-full uppercase tracking-wider">
                Category: Notification Controls
              </span>
            </div>

            <p className="text-xs text-slate-500 font-medium">
              លោកអ្នកអាចបិទ ឬបើកការផ្ញើសារជូនដំណឹង Alert តាមផ្នែកនីមួយៗក្នុងប្រព័ន្ធបានយ៉ាងងាយស្រួលខាងក្រោម៖
            </p>

            <div className="space-y-4">
              {/* SWITCH 1: System Push Notifications */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between transition-all hover:bg-white hover:border-slate-300">
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 font-bold">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">ប្រព័ន្ធសារ Push Notifications</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      អនុញ្ញាតឱ្យប្រព័ន្ធផ្ញើសារជូនដំណឹង Notification កម្រិត Global ទៅកាន់អ្នកប្រើប្រាស់
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={enablePushNotifications}
                    onChange={(e) => setEnablePushNotifications(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-red"></div>
                </label>
              </div>

              {/* SWITCH 2: Telegram Bot Security Alerts */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between transition-all hover:bg-white hover:border-slate-300">
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center flex-shrink-0 font-bold">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">ការផ្ញើសារអាសន្ន Telegram Alerts</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      ផ្ញើសារអាសន្នទៅកាន់ Telegram Bot ភ្លាមៗពេលមានការវាយប្រហារ brute-force ឬ SQLi
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={enableTelegramAlerts}
                    onChange={(e) => setEnableTelegramAlerts(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-red"></div>
                </label>
              </div>

              {/* SWITCH 3: Security Threat Popups */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between transition-all hover:bg-white hover:border-slate-300">
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0 font-bold">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">ផ្ទាំងអាសន្នសុវត្ថិភាព (Security Popups)</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      បង្ហាញផ្ទាំងក្រហមព្រមានសុវត្ថិភាពពេលមាន IP Blocked ឬ Malicious Activity
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={enableSecurityAlerts}
                    onChange={(e) => setEnableSecurityAlerts(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-red"></div>
                </label>
              </div>

              {/* SWITCH 4: Series Follower New Episode Alerts */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between transition-all hover:bg-white hover:border-slate-300">
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0 font-bold">
                    <Film className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">ការជូនដំណឹងភាគថ្មីទៅអ្នកតាមដាន (Episode Alerts)</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      ផ្ញើសារជូនដំណឹងជាស្វ័យប្រវត្តិទៅកាន់ Followers នៅពេលមានរឿងភាគបញ្ចេញភាគថ្មី
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={enableNewEpisodeAlerts}
                    onChange={(e) => setEnableNewEpisodeAlerts(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-red"></div>
                </label>
              </div>

              {/* SWITCH 5: Admin Alert on User Logins */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between transition-all hover:bg-white hover:border-slate-300">
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 font-bold">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">ការជូនដំណឹងនៅពេលមានអ្នកចូលប្រព័ន្ធ (Login Alerts)</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      ផ្ញើសារជូនដំណឹងទៅកាន់ Admin នៅពេលមានគណនីសំខាន់ចូលប្រព័ន្ធ
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={enableUserLoginAlerts}
                    onChange={(e) => setEnableUserLoginAlerts(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-red"></div>
                </label>
              </div>

              {/* SWITCH 6: Require Account to Watch Movies */}
              <div className="p-4 bg-amber-50/50 border border-amber-200/80 rounded-2xl flex items-center justify-between transition-all hover:bg-amber-50 hover:border-amber-300">
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0 font-bold">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">ទាមទារបង្កើត/ចូលប្រើប្រាស់គណនីដើម្បីទស្សនា (Require Account to Watch)</h4>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      នៅពេលបើក ភ្ញៀវដែលមិនទាន់មានគណនី (Guest Users) មិនអាចទស្សនាវីដេអូបានទេ ដោយប្រព័ន្ធនឹងបង្ហាញផ្ទាំងឱ្យបង្កើត ឬចូលប្រើប្រាស់អាខោន
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={requireLoginToWatch}
                    onChange={(e) => setRequireLoginToWatch(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="px-8 py-3.5 bg-brand-red hover:bg-brand-crimson text-white font-extrabold rounded-2xl shadow-lg shadow-brand-red/30 flex items-center space-x-2 text-sm transition-all hover:scale-105"
              >
                <Save className="w-5 h-5" />
                <span>រក្សាទុកការកំណត់ Notification Alert Switches</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: SOCIAL MEDIA LINKS SETTINGS */}
        {activeTab === 'social' && (
          <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                <Share2 className="w-5 h-5 text-blue-600" />
                <span>គ្រប់គ្រង Link បណ្តាញសង្គម (Social Media Links)</span>
              </h3>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full uppercase tracking-wider">
                Category: Social Media
              </span>
            </div>

            <p className="text-xs text-slate-500 font-medium">
              កំណត់ URL បណ្តាញសង្គមរបស់អ្នកដើម្បីបង្ហាញរូបតំណាង Link ទាំងអស់នៅលើ Footer នៃគេហទំព័រ User។
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="flex items-center space-x-2 font-bold text-slate-800 uppercase tracking-wider">
                  <Facebook className="w-4 h-4 text-blue-600" />
                  <span>Facebook Page / Profile URL</span>
                </label>
                <input
                  type="text"
                  placeholder="https://facebook.com/yourpage"
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-3 text-xs focus:border-brand-red focus:bg-white focus:outline-none font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center space-x-2 font-bold text-slate-800 uppercase tracking-wider">
                  <Globe className="w-4 h-4 text-emerald-600" />
                  <span>TikTok Profile / Link URL</span>
                </label>
                <input
                  type="text"
                  placeholder="https://tiktok.com/@youraccount"
                  value={tiktokUrl}
                  onChange={(e) => setTiktokUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-3 text-xs focus:border-brand-red focus:bg-white focus:outline-none font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center space-x-2 font-bold text-slate-800 uppercase tracking-wider">
                  <Send className="w-4 h-4 text-blue-500" />
                  <span>Telegram Channel / Group URL</span>
                </label>
                <input
                  type="text"
                  placeholder="https://t.me/yourchannel"
                  value={telegramUrl}
                  onChange={(e) => setTelegramUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-3 text-xs focus:border-brand-red focus:bg-white focus:outline-none font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center space-x-2 font-bold text-slate-800 uppercase tracking-wider">
                  <Instagram className="w-4 h-4 text-pink-600" />
                  <span>Instagram Profile URL</span>
                </label>
                <input
                  type="text"
                  placeholder="https://instagram.com/yourprofile"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-3 text-xs focus:border-brand-red focus:bg-white focus:outline-none font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center space-x-2 font-bold text-slate-800 uppercase tracking-wider">
                  <Twitter className="w-4 h-4 text-sky-500" />
                  <span>Twitter / X Profile URL</span>
                </label>
                <input
                  type="text"
                  placeholder="https://twitter.com/yourprofile"
                  value={twitterUrl}
                  onChange={(e) => setTwitterUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-3 text-xs focus:border-brand-red focus:bg-white focus:outline-none font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center space-x-2 font-bold text-slate-800 uppercase tracking-wider">
                  <Github className="w-4 h-4 text-slate-900" />
                  <span>GitHub Repository / Profile URL</span>
                </label>
                <input
                  type="text"
                  placeholder="https://github.com/yourusername"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-3 text-xs focus:border-brand-red focus:bg-white focus:outline-none font-medium"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="px-8 py-3.5 bg-brand-red hover:bg-brand-crimson text-white font-extrabold rounded-2xl shadow-lg shadow-brand-red/30 flex items-center space-x-2 text-sm transition-all hover:scale-105"
              >
                <Save className="w-5 h-5" />
                <span>រក្សាទុក Social Media Links</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB: MOBILE APP DOWNLOAD SETTINGS */}
        {activeTab === 'app' && (
          <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                <Smartphone className="w-5 h-5 text-purple-600" />
                <span>គ្រប់គ្រងផ្នែកទាញយក Mobile App (Mobile App Links & Section)</span>
              </h3>
              <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1 rounded-full uppercase tracking-wider">
                Category: Mobile App
              </span>
            </div>

            <p className="text-xs text-slate-500 font-medium">
              កំណត់ព័ត៌មាន និង Link ទាញយកកម្មវិធីលើទូរស័ព្ទ (Android / iOS / Direct APK) ដែលត្រូវបង្ហាញលើគេហទំព័រ User។
            </p>

            <div className="space-y-4 text-xs">
              <div className="flex items-center space-x-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <input
                  type="checkbox"
                  id="showAppSec"
                  checked={showAppSection}
                  onChange={(e) => setShowAppSection(e.target.checked)}
                  className="w-4 h-4 accent-brand-red rounded"
                />
                <label htmlFor="showAppSec" className="text-xs font-bold text-slate-900 cursor-pointer">
                  បង្ហាញផ្នែកទាញយក Mobile App លើគេហទំព័រ (Enable App Download Section)
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-800 uppercase tracking-wider">ចំណងជើងផ្នែក (Section Title)</label>
                  <input
                    type="text"
                    value={appSectionTitle}
                    onChange={(e) => setAppSectionTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-3 text-xs focus:border-brand-red focus:bg-white font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-800 uppercase tracking-wider">ការពិពណ៌នាសង្ខេប (Subtitle)</label>
                  <input
                    type="text"
                    value={appSectionSubtitle}
                    onChange={(e) => setAppSectionSubtitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-3 text-xs focus:border-brand-red focus:bg-white font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-800 uppercase tracking-wider">Google Play Store URL (Android)</label>
                  <input
                    type="text"
                    value={androidAppUrl}
                    onChange={(e) => setAndroidAppUrl(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-3 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-800 uppercase tracking-wider">Apple App Store URL (iOS)</label>
                  <input
                    type="text"
                    value={iosAppUrl}
                    onChange={(e) => setIosAppUrl(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-3 text-xs font-mono"
                  />
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <label className="block font-bold text-slate-800 uppercase tracking-wider">Direct APK File Download URL (.apk)</label>
                  <input
                    type="text"
                    value={apkDownloadUrl}
                    onChange={(e) => setApkDownloadUrl(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-3 text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="px-8 py-3.5 bg-brand-red hover:bg-brand-crimson text-white font-extrabold rounded-2xl shadow-lg shadow-brand-red/30 flex items-center space-x-2 text-sm transition-all hover:scale-105"
              >
                <Save className="w-5 h-5" />
                <span>រក្សាទុក Mobile App Settings</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB: ACTIVE USER SESSIONS & DEVICES MANAGEMENT */}
        {activeTab === 'sessions' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                <span>គ្រប់គ្រង Sessions & Devices ដែលកំពុងចូលប្រើប្រាស់ (Active User Sessions)</span>
              </h3>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full uppercase tracking-wider">
                Active Devices: {userSessions.length}
              </span>
            </div>

            <p className="text-xs text-slate-500 font-medium">
              បញ្ជីឧបករណ៍ (Devices) និង IP Addresses ដែលកំពុងមាន Session ចូលប្រើប្រាស់ក្នុងប្រព័ន្ធ។ Admin អាចចុច Revoke ដើម្បីផ្ដាច់ Session ដោយបង្ខំ។
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-mono border-b border-slate-200">
                  <tr>
                    <th className="p-3">អ្នកប្រើប្រាស់</th>
                    <th className="p-3">IP Address</th>
                    <th className="p-3">Device / Browser</th>
                    <th className="p-3">សកម្មភាពចុងក្រោយ</th>
                    <th className="p-3 text-right">សកម្មភាព</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sessionsLoading ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400 font-bold">
                        កំពុងទាញយកបញ្ជី Active Sessions...
                      </td>
                    </tr>
                  ) : userSessions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400 font-bold">
                        មិនមាន Session កំពុងសកម្មនៅឡើយទេ
                      </td>
                    </tr>
                  ) : (
                    userSessions.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-bold text-slate-900">{s.user_email || s.user_id}</td>
                        <td className="p-3 font-mono text-slate-600">{s.ip_address}</td>
                        <td className="p-3 text-slate-500 truncate max-w-xs font-mono text-[11px]">{s.user_agent}</td>
                        <td className="p-3 text-slate-500 font-mono text-[11px]">
                          {s.last_active ? new Date(s.last_active).toLocaleString('km-KH') : 'មិនមាន'}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleRevokeSession(s.id)}
                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[11px] rounded-xl border border-red-200 transition-all"
                            title="ផ្ដាច់ Session នេះ"
                          >
                            ផ្ដាច់ Device
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: TELEGRAM BOT NOTIFICATION SETTINGS */}
        {activeTab === 'telegram' && (
          <form onSubmit={handleSaveTelegram} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                <Send className="w-5 h-5 text-sky-500" />
                <span>កំណត់រចនាសម្ព័ន្ធ Telegram Security Alert Bot</span>
              </h3>
              <span className="text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-3 py-1 rounded-full uppercase tracking-wider">
                Category: Telegram Bot
              </span>
            </div>

            <p className="text-xs text-slate-500">
              បញ្ចូល Telegram Bot Token និង Chat ID ដើម្បីទទួលការជូនដំណឹងស្វ័យប្រវត្តិនៅពេលមានការវាយប្រហារ (Security Attack), Auto IP Ban, ឬការចុះឈ្មោះពី User ថ្មី។
            </p>

            {tgMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3.5 rounded-xl text-xs font-bold flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{tgMsg}</span>
              </div>
            )}

            {tgError && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3.5 rounded-xl text-xs font-bold">
                {tgError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1.5 uppercase">Telegram Bot Token *</label>
                <input
                  type="text"
                  placeholder="1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                  value={telegramBotToken}
                  onChange={(e) => setTelegramBotToken(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-3 text-sm focus:border-sky-500 focus:bg-white focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5 uppercase">Telegram Chat ID / Group ID *</label>
                <input
                  type="text"
                  placeholder="-100123456789"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-3 text-sm focus:border-sky-500 focus:bg-white focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={handleTestTelegram}
                disabled={tgTesting}
                className="px-5 py-3 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center space-x-2 transition-all"
              >
                <Send className="w-4 h-4" />
                <span>{tgTesting ? 'កំពុងផ្ញើសារសាកល្បង...' : 'ផ្ញើសារសាកល្បង (Send Test Alert)'}</span>
              </button>

              <button
                type="submit"
                disabled={tgSaving}
                className="px-8 py-3.5 bg-brand-red hover:bg-brand-crimson text-white font-extrabold rounded-2xl shadow-lg shadow-brand-red/30 flex items-center space-x-2 text-sm transition-all hover:scale-105"
              >
                <Save className="w-5 h-5" />
                <span>{tgSaving ? 'កំពុងរក្សាទុក...' : 'រក្សាទុក Telegram Settings'}</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 4: ADMIN SECURITY (PASSWORD CHANGE) */}
        {activeTab === 'security' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                <KeyRound className="w-5 h-5 text-amber-600" />
                <span>កែប្រែលេខសម្ងាត់ Admin (Change Admin Password)</span>
              </h3>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full uppercase tracking-wider">
                Category: Security
              </span>
            </div>

            {pwdMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3.5 rounded-xl text-xs font-bold flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{pwdMsg}</span>
              </div>
            )}

            {pwdError && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3.5 rounded-xl text-xs font-bold">
                {pwdError}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    លេខសម្ងាត់ចាស់ (Current)
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-3 text-sm focus:border-brand-red focus:bg-white focus:outline-none"
                  />
                </div>

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
                    ផ្ទៀងផ្ទាត់លេខសម្ងាត់ថ្មី (Confirm)
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
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={pwdSaving}
                  className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center space-x-2 transition-all hover:scale-105"
                >
                  <Lock className="w-4 h-4" />
                  <span>{pwdSaving ? 'កំពុងប្តូរ...' : 'ប្តូរលេខសម្ងាត់ Admin'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 5: GENERAL SYSTEM SETTINGS & BACKUP */}
        {activeTab === 'system' && (
          <div className="space-y-6 animate-fade-in">
            <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                  <Sliders className="w-5 h-5 text-blue-600" />
                  <span>ការកំណត់ប្រព័ន្ធទូទៅ (System Parameters)</span>
                </h3>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full uppercase tracking-wider">
                  Category: System
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase">ឈ្មោះគេហទំព័រ (Platform Name)</label>
                  <input
                    type="text"
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-3 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase">កម្រិតវីដេអូម៉ាស៊ីន (Default Quality)</label>
                  <select
                    value={defaultQuality}
                    onChange={(e) => setDefaultQuality(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold rounded-xl p-3 text-sm"
                  >
                    <option value="4K">4K Ultra HD (2160p)</option>
                    <option value="1080p">Full HD (1080p)</option>
                    <option value="720p">HD (720p)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase">កម្រិត Bitrate អតិបរមា (Max Bitrate)</label>
                  <input
                    type="text"
                    value={maxBitrate}
                    onChange={(e) => setMaxBitrate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-3 text-sm"
                  />
                </div>

                <div className="flex items-center space-x-3 pt-5">
                  <input
                    type="checkbox"
                    id="maint"
                    checked={maintenanceMode}
                    onChange={(e) => setMaintenanceMode(e.target.checked)}
                    className="w-4 h-4 accent-brand-red rounded"
                  />
                  <label htmlFor="maint" className="text-sm font-bold text-slate-800 cursor-pointer">
                    របៀបថែទាំប្រព័ន្ធ (Maintenance Mode)
                  </label>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  className="px-8 py-3.5 bg-brand-red hover:bg-brand-crimson text-white font-extrabold rounded-2xl shadow-lg shadow-brand-red/30 flex items-center space-x-2 text-sm transition-all hover:scale-105"
                >
                  <Save className="w-5 h-5" />
                  <span>រក្សាទុកការកំណត់ប្រព័ន្ធ</span>
                </button>
              </div>
            </form>

            {/* DATABASE BACKUP & RESTORE PANEL */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>ការទាញយកទិន្នន័យត្រឡប់ (1-Click Database Backup & Restore)</span>
                </h3>
              </div>

              {restoreMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3.5 rounded-xl text-xs font-bold">
                  {restoreMsg}
                </div>
              )}

              {restoreError && (
                <div className="bg-red-50 border border-red-200 text-red-600 p-3.5 rounded-xl text-xs font-bold">
                  {restoreError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-3">
                  <h4 className="font-extrabold text-slate-900 text-sm">១. ទាញយក Database Backup (.db)</h4>
                  <p className="text-slate-500">រក្សាទុកឯកសារ Database SQLite SQLite Copy ទុកក្នុងម៉ាស៊ីនសុវត្ថិភាព។</p>
                  <button
                    onClick={handleDownloadBackup}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md flex items-center space-x-2 transition-all"
                  >
                    <Upload className="w-4 h-4 rotate-180" />
                    <span>ទាញយក Database Backup</span>
                  </button>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-3">
                  <h4 className="font-extrabold text-slate-900 text-sm">២. Restore ទិន្នន័យពីឯកសារ Backup (.db)</h4>
                  <p className="text-slate-500">ជ្រើសរើសឯកសារ .db ដើមដើម្បី Restore ទិន្នន័យត្រឡប់មកវិញ។</p>
                  <label className="inline-flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md cursor-pointer transition-all">
                    <Upload className="w-4 h-4" />
                    <span>{restoreLoading ? 'កំពុងទាញយក...' : 'ជ្រើសរើសឯកសារ Restore'}</span>
                    <input type="file" accept=".db" onChange={handleRestoreDatabase} disabled={restoreLoading} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Custom Confirm & Alert Modal */}
        {confirmModal.isOpen &&
          createPortal(
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[999999] animate-in fade-in duration-200">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
                <div className="flex items-center space-x-3">
                  <div
                    className={`p-3 rounded-2xl ${
                      confirmModal.variant === 'danger' ? 'bg-red-500/10 text-red-400' : 'bg-brand-red/10 text-brand-red'
                    }`}
                  >
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{confirmModal.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{confirmModal.message}</p>
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-2">
                  {confirmModal.cancelText ? (
                    <button
                      onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
                    >
                      {confirmModal.cancelText}
                    </button>
                  ) : null}
                  <button
                    onClick={() => {
                      const action = confirmModal.onConfirm;
                      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                      action();
                    }}
                    className="px-4 py-2 bg-brand-red hover:bg-red-700 text-white text-xs font-extrabold rounded-xl shadow-lg transition"
                  >
                    {confirmModal.confirmText || 'យល់ព្រម'}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}
      </div>
    </AdminLayout>
  );
}
