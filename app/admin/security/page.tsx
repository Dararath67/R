'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { api } from '@/lib/api';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  KeyRound,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Filter,
  Ban,
  Unlock,
  Globe,
  Plus,
} from 'lucide-react';

interface SecurityLog {
  id: number;
  eventType: string;
  details: string;
  ipAddress: string;
  timestamp: string;
}

interface BannedIp {
  ipAddress: string;
  reason: string;
  bannedAt: string;
}

export default function AdminSecurityLogsPage() {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [bannedIps, setBannedIps] = useState<BannedIp[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [customIp, setCustomIp] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [showBanModal, setShowBanModal] = useState(false);

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

  const [sessions, setSessions] = useState<any[]>([]);

  const fetchSecurityData = async () => {
    setLoading(true);
    try {
      const [logsData, bannedData, healthData, sessionsData] = await Promise.all([
        api.getSecurityLogs(),
        api.getBannedIps(),
        api.getSecurityHealth(),
        api.getActiveSessions(),
      ]);
      setLogs(logsData || []);
      setBannedIps(bannedData || []);
      setHealth(healthData);
      setSessions(sessionsData || []);
    } catch (err) {
      console.error('Failed to load security audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

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

  const handleRevokeSession = async (sessionId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'បញ្ជាក់ការបញ្ចប់ Session',
      message: 'តើអ្នកប្រាកដជាចង់ Force Logout ឧបករណ៍នេះមែនទេ?',
      confirmText: ' Force Logout',
      cancelText: 'បោះបង់',
      variant: 'danger',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await api.revokeSession(sessionId);
          await fetchSecurityData();
          showAlert('ជោគជ័យ', 'Session ត្រូវបានបញ្ចប់ដោយជោគជ័យ!');
        } catch (err: any) {
          showAlert('បរាជ័យ', err.message || 'បរាជ័យក្នុងការបញ្ចប់ Session');
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const handleBanIp = async (ipAddress: string, reason?: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'បញ្ជាក់ការផ្អាក IP Address',
      message: `តើអ្នកប្រាកដជាចង់ផ្អាក IP Address (${ipAddress}) នេះមែនទេ?`,
      confirmText: 'ផ្អាក IP',
      cancelText: 'បោះបង់',
      variant: 'danger',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await api.banIp(ipAddress, reason || 'Banned by Admin from Security Audit Log');
          await fetchSecurityData();
          showAlert('ជោគជ័យ', `IP Address [${ipAddress}] ត្រូវបានរារាំងដោយជោគជ័យ!`);
        } catch (err: any) {
          showAlert('បរាជ័យ', err.message || 'ការផ្អាក IP បរាជ័យ');
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const handleUnbanIp = async (ipAddress: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'បញ្ជាក់ការបើក IP Address វិញ',
      message: `តើអ្នកប្រាកដជាចង់បើក IP Address (${ipAddress}) នេះវិញមែនទេ?`,
      confirmText: 'បើក IP វិញ',
      cancelText: 'បោះបង់',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await api.unbanIp(ipAddress);
          await fetchSecurityData();
          showAlert('ជោគជ័យ', `IP Address [${ipAddress}] ត្រូវបានដកការរារាំងវិញដោយជោគជ័យ!`);
        } catch (err: any) {
          showAlert('បរាជ័យ', err.message || 'ការដកការរារាំង IP បរាជ័យ');
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const handleCustomBanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customIp.trim()) return;
    const targetIp = customIp.trim();
    setActionLoading(true);
    try {
      await api.banIp(targetIp, customReason.trim() || 'Manual Admin IP Ban');
      setCustomIp('');
      setCustomReason('');
      setShowBanModal(false);
      await fetchSecurityData();
      showAlert('ជោគជ័យ', `IP Address [${targetIp}] ត្រូវបានរារាំងដោយជោគជ័យ!`);
    } catch (err: any) {
      showAlert('បរាជ័យ', err.message || 'ការផ្អាក IP បរាជ័យ');
    } finally {
      setActionLoading(false);
    }
  };

  const isIpBannedCurrently = (ip: string) => {
    return bannedIps.some((b) => b.ipAddress === ip);
  };

  const getEventTypeBadge = (eventType: string) => {
    switch (eventType) {
      case 'LOGIN_SUCCESS':
      case 'USER_REGISTERED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            {eventType}
          </span>
        );
      case 'SQLI_PAYLOAD_ATTEMPT':
      case 'MALICIOUS_FILE_UPLOAD_ATTEMPT':
      case 'BRUTE_FORCE_AUTO_BAN_IP':
      case 'MANUAL_IP_BAN':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">
            <ShieldAlert className="w-3 h-3 text-red-600" />
            {eventType}
          </span>
        );
      case 'FAILED_LOGIN_UNKNOWN_USER':
      case 'FAILED_LOGIN_BAD_PASSWORD':
      case 'RATE_LIMIT_EXCEEDED':
      case 'BANNED_IP_BLOCKED_REQUEST':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            {eventType}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            <Activity className="w-3 h-3 text-slate-500" />
            {eventType}
          </span>
        );
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.ipAddress.includes(searchTerm) ||
      log.eventType.toLowerCase().includes(searchTerm.toLowerCase());

    if (selectedFilter === 'ALL') return matchesSearch;
    if (selectedFilter === 'ALERTS')
      return (
        matchesSearch &&
        (log.eventType.includes('SQLI') ||
          log.eventType.includes('ATTEMPT') ||
          log.eventType.includes('FAILED') ||
          log.eventType.includes('BAN') ||
          log.eventType.includes('RATE_LIMIT'))
      );
    if (selectedFilter === 'AUTH')
      return (
        matchesSearch &&
        (log.eventType.includes('LOGIN') || log.eventType.includes('REGISTER'))
      );
    return matchesSearch;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header Title Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="p-2 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-600">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-black text-slate-900 uppercase tracking-wide">
                កំណត់ហេតុសុវត្ថិភាព & ការគ្រប់គ្រង IP (Security Logs & IP Ban)
              </h1>
            </div>
            <p className="text-xs text-slate-500 font-medium pl-9">
              តាមដានរាល់សកម្មភាពចូលប្រើប្រាស់ ការស្វ័យប្រវត្តិតាមដាន IP និងការចុច 1-Click Ban IP ដោយផ្ទាល់
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowBanModal(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>ផ្អាក IP ថ្មី (Ban IP)</span>
            </button>
            <button
              onClick={fetchSecurityData}
              disabled={loading}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>ធ្វើបច្ចុប្បន្នភាព</span>
            </button>
          </div>
        </div>

        {/* Banned IPs Panel */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-950 p-6 rounded-3xl text-white shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Ban className="w-5 h-5 text-red-400" />
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-white">
                បញ្ជី IP Address ដែលត្រូវបានប្រព័ន្ធ និង Admin រារាំង (Banned IPs List: {bannedIps.length})
              </h2>
            </div>
            <span className="text-[10px] font-extrabold bg-red-950 text-red-300 px-3 py-1 rounded-full border border-red-800">
              Auto IP Ban Active
            </span>
          </div>

          {bannedIps.length === 0 ? (
            <p className="text-xs text-slate-400 font-medium py-2">
              មិនទាន់មាន IP Address ណាត្រូវបានរារាំងនៅឡើយទេ (No IP addresses currently banned)
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {bannedIps.map((b) => (
                <div
                  key={b.ipAddress}
                  className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between gap-2"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <Globe className="w-3.5 h-3.5 text-red-400" />
                      <span className="text-xs font-mono font-black text-red-300 truncate">
                        {b.ipAddress}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">{b.reason}</p>
                  </div>

                  <button
                    onClick={() => handleUnbanIp(b.ipAddress)}
                    disabled={actionLoading}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-[10px] flex items-center space-x-1 flex-shrink-0 transition-colors"
                  >
                    <Unlock className="w-3 h-3" />
                    <span>បើក IP វិញ</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security Health Cards */}
        {health && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Encryption Hashing</span>
                <Lock className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-sm font-extrabold text-slate-900">Bcrypt Salted (12 Rounds)</p>
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 inline-block">
                Active Protection
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>API Bearer Token</span>
                <KeyRound className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-sm font-extrabold text-slate-900">Signed JWT Tokens (HS256)</p>
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 inline-block">
                Active Protection
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Rate Limiting & Lock</span>
                <Activity className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-sm font-extrabold text-slate-900">120 Req/Min & Auto Ban IP</p>
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 inline-block">
                Active Protection
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Payload & Injection Shield</span>
                <ShieldAlert className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-sm font-extrabold text-slate-900">XSS, SQLi & File Whitelist</p>
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 inline-block">
                Active Protection
              </span>
            </div>
          </div>
        )}

        {/* ACTIVE SESSIONS & FORCE LOGOUT SECTION */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
              <Globe className="w-5 h-5 text-indigo-600" />
              <span>ការគ្រប់គ្រង Session កំពុងដំណើរការ (Active User Sessions & Force Logout)</span>
            </h3>
            <span className="text-xs font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full">
              {sessions.length} Active Sessions
            </span>
          </div>

          {sessions.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">មិនទាន់មាន Active User Session ត្រូវបានកត់ត្រានៅឡើយទេ</p>
          ) : (
            <>
              {/* Desktop Active Sessions Table View (>= md) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold text-slate-500 uppercase">
                      <th className="py-2.5 px-4">User Email</th>
                      <th className="py-2.5 px-4">IP Address</th>
                      <th className="py-2.5 px-4">User Agent</th>
                      <th className="py-2.5 px-4">Last Active</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold">
                    {sessions.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 text-slate-900">{s.user_email || s.user_id}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-700">{s.ip_address || '127.0.0.1'}</td>
                        <td className="py-2.5 px-4 text-slate-500 truncate max-w-xs">{s.user_agent || 'Mozilla/5.0'}</td>
                        <td className="py-2.5 px-4 text-slate-400 font-medium">{new Date(s.last_active).toLocaleString()}</td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            onClick={() => handleRevokeSession(s.id)}
                            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 font-extrabold rounded-lg text-[10px] transition-colors"
                          >
                            Force Logout (Kick)
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Active Sessions Card View (< md) */}
              <div className="block md:hidden divide-y divide-slate-100">
                {sessions.map((s) => (
                  <div key={s.id} className="p-3.5 space-y-2 bg-slate-50/50 rounded-2xl border border-slate-100 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{s.user_email || s.user_id}</span>
                      <span className="font-mono text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">{s.ip_address || '127.0.0.1'}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 truncate">{s.user_agent || 'Mozilla/5.0'}</p>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                      <span className="text-[10px] text-slate-400 font-medium">{new Date(s.last_active).toLocaleString()}</span>
                      <button
                        onClick={() => handleRevokeSession(s.id)}
                        className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-700 font-extrabold rounded-lg text-[10px]"
                      >
                        Kick
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="ស្វែងរកតាម IP, Event ឬ Details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold focus:outline-none focus:border-brand-red focus:bg-white"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 text-xs" />
          </div>

          <div className="flex items-center space-x-2 w-full md:w-auto">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> ម្រង:
            </span>
            <button
              onClick={() => setSelectedFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                selectedFilter === 'ALL'
                  ? 'bg-brand-red text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ទាំងអស់ ({logs.length})
            </button>
            <button
              onClick={() => setSelectedFilter('ALERTS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                selectedFilter === 'ALERTS'
                  ? 'bg-brand-red text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ការព្រមាន & ការវាយប្រហារ
            </button>
            <button
              onClick={() => setSelectedFilter('AUTH')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                selectedFilter === 'AUTH'
                  ? 'bg-brand-red text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ការចូលប្រើប្រាស់
            </button>
          </div>
        </div>

        {/* Security Logs Table & Mobile Cards */}
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          {/* Desktop Security Logs Table View (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                  <th className="py-4 px-6">ID</th>
                  <th className="py-4 px-6">ប្រភេទព្រឹត្តិការណ៍ (Event Type)</th>
                  <th className="py-4 px-6">ព័ត៌មានលម្អិត (Details)</th>
                  <th className="py-4 px-6">អាសយដ្ឋាន IP (Client IP)</th>
                  <th className="py-4 px-6">កាលបរិច្ឆេទ & ម៉ោង</th>
                  <th className="py-4 px-6 text-right">សកម្មភាព (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                      កំពុងទាញយកកំណត់ហេតុសុវត្ថិភាព...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                      មិនទាន់មានកំណត់ហេតុសុវត្ថិភាពត្រូវបានកត់ត្រានៅឡើយទេ
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const isBanned = isIpBannedCurrently(log.ipAddress);
                    return (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-6 font-mono font-bold text-slate-500">#{log.id}</td>
                        <td className="py-3.5 px-6 font-bold">{getEventTypeBadge(log.eventType)}</td>
                        <td className="py-3.5 px-6 font-bold text-slate-800">{log.details}</td>
                        <td className="py-3.5 px-6 font-mono font-black text-slate-700">
                          {log.ipAddress}
                        </td>
                        <td className="py-3.5 px-6 text-slate-500 font-medium whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-6 text-right whitespace-nowrap">
                          {isBanned ? (
                            <button
                              onClick={() => handleUnbanIp(log.ipAddress)}
                              disabled={actionLoading}
                              className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-extrabold rounded-xl text-[11px] transition-colors inline-flex items-center space-x-1"
                            >
                              <Unlock className="w-3 h-3" />
                              <span>បើក IP វិញ</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBanIp(log.ipAddress, `Banned for ${log.eventType}`)}
                              disabled={actionLoading}
                              className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 font-extrabold rounded-xl text-[11px] transition-colors inline-flex items-center space-x-1"
                            >
                              <Ban className="w-3 h-3 text-red-600" />
                              <span>ផ្អាក IP (Ban IP)</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Security Logs Cards View (< md) */}
          <div className="block md:hidden divide-y divide-slate-100">
            {loading ? (
              <div className="py-12 text-center text-slate-400 font-bold text-xs">
                កំពុងទាញយកកំណត់ហេតុសុវត្ថិភាព...
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-bold text-xs">
                មិនទាន់មានកំណត់ហេតុសុវត្ថិភាពត្រូវបានកត់ត្រានៅឡើយទេ
              </div>
            ) : (
              filteredLogs.map((log) => {
                const isBanned = isIpBannedCurrently(log.ipAddress);
                return (
                  <div key={log.id} className="p-4 space-y-2 bg-white">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-[10px] text-slate-400">#{log.id}</span>
                        {getEventTypeBadge(log.eventType)}
                      </div>
                      <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-bold">
                        {log.ipAddress}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-slate-800">{log.details}</p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px]">
                      <span className="text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>

                      {isBanned ? (
                        <button
                          onClick={() => handleUnbanIp(log.ipAddress)}
                          disabled={actionLoading}
                          className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-extrabold rounded-lg inline-flex items-center space-x-1"
                        >
                          <Unlock className="w-3 h-3" />
                          <span>បើក IP វិញ</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBanIp(log.ipAddress, `Banned for ${log.eventType}`)}
                          disabled={actionLoading}
                          className="px-2.5 py-1 bg-red-100 text-red-700 font-extrabold rounded-lg inline-flex items-center space-x-1"
                        >
                          <Ban className="w-3 h-3 text-red-600" />
                          <span>Ban IP</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Modal for Custom IP Ban */}
        {showBanModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
              <div className="flex items-center space-x-2 text-red-600">
                <Ban className="w-5 h-5" />
                <h3 className="text-base font-black text-slate-900 uppercase">ផ្អាក IP Address ថ្មី (Ban IP Address)</h3>
              </div>

              <form onSubmit={handleCustomBanSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    អាសយដ្ឋាន IP (IP Address)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="192.168.1.100"
                    value={customIp}
                    onChange={(e) => setCustomIp(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm font-mono font-bold focus:outline-none focus:border-brand-red"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    មូលហេតុផ្អាក (Ban Reason)
                  </label>
                  <input
                    type="text"
                    placeholder="ឧទាហរណ៍ ៖ ប៉ុនប៉ងវាយប្រហារ DDoS ឬ SQL Injection"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold focus:outline-none focus:border-brand-red"
                  />
                </div>

                <div className="flex items-center justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowBanModal(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                  >
                    បោះបង់
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-4 py-2.5 bg-brand-red hover:bg-red-700 text-white font-extrabold rounded-xl shadow-md shadow-brand-red/30"
                  >
                    {actionLoading ? 'កំពុងផ្អាក IP...' : 'រារាំង IP នេះ'}
                  </button>
                </div>
              </form>
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
