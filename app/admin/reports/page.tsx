'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { api } from '@/lib/api';
import { AlertTriangle, CheckCircle, XCircle, Clock, RefreshCw, AlertCircle } from 'lucide-react';

interface VideoReport {
  id: string;
  content_id: string;
  content_title: string;
  episode_id?: string;
  episode_title?: string;
  user_id: string;
  user_name: string;
  reason: string;
  details?: string;
  status: 'pending' | 'fixed' | 'dismissed';
  created_at: string;
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<VideoReport[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

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

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAdminReports(filterStatus === 'all' ? undefined : filterStatus);
      setReports(data || []);
    } catch {
      setReports([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [filterStatus]);

  const handleUpdateStatus = async (reportId: string, status: string) => {
    try {
      await api.updateReportStatus(reportId, status);
      await fetchReports();
    } catch (err: any) {
      showAlert('បរាជ័យ', err.message || 'បរាជ័យក្នុងការធ្វើបច្ចុប្បន្នភាព');
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6 font-khmer">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-red-50 text-brand-red rounded-xl">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">
                គ្រប់គ្រងការរាយការណ៍វីដេអូខូច (Broken Video Reports)
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                ពិនិត្យមើលបញ្ហាវីដេអូមិនដើរ គ្មានសំឡេង ឬរូបភាពខូច ដែលបានរាយការណ៍ដោយសមាជិក
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchReports}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Status Filter Bar */}
        <div className="flex items-center space-x-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm max-w-full overflow-x-auto text-xs font-bold whitespace-nowrap">
          {['all', 'pending', 'fixed', 'dismissed'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-4 py-2 rounded-xl transition capitalize ${
                filterStatus === st
                  ? 'bg-brand-red text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {st === 'all'
                ? 'ទាំងអស់'
                : st === 'pending'
                ? 'កំពុងរង់ចាំ (Pending)'
                : st === 'fixed'
                ? 'បានកែសម្រួល (Fixed)'
                : 'បោះបង់ (Dismissed)'}
            </button>
          ))}
        </div>

        {/* Reports Table & Mobile Cards */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-400">កំពុងទាញយកទិន្នន័យ...</div>
          ) : reports.length === 0 ? (
            <div className="p-12 text-center space-y-2 text-slate-400">
              <CheckCircle className="w-12 h-12 mx-auto text-emerald-400 opacity-50" />
              <p className="text-xs">គ្មានការរាយការណ៍ក្នុងប្រអប់នេះទេ</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View (>= md) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                      <th className="p-4">ភាពយន្ត / ភាគ</th>
                      <th className="p-4">អ្នករាយការណ៍</th>
                      <th className="p-4">មូលហេតុបញ្ហា</th>
                      <th className="p-4">ព័ត៌មានបន្ថែម</th>
                      <th className="p-4">កាលបរិច្ឆេទ</th>
                      <th className="p-4">ស្ថានភាព</th>
                      <th className="p-4 text-right">សកម្មភាព</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {reports.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-4 font-bold text-slate-900">
                          <div>{r.content_title}</div>
                          {r.episode_title && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              {r.episode_title}
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="font-semibold">{r.user_name}</span>
                          <span className="block text-[10px] text-slate-400 font-mono">
                            ID: {r.user_id}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-red-600">{r.reason}</td>
                        <td className="p-4 text-slate-500 max-w-xs truncate">{r.details || '-'}</td>
                        <td className="p-4 text-slate-400 font-mono text-[11px]">
                          {new Date(r.created_at).toLocaleString([], {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td className="p-4">
                          {r.status === 'pending' && (
                            <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-[10px] font-bold border border-amber-200 flex items-center gap-1 w-fit">
                              <Clock className="w-3 h-3" /> Pending
                            </span>
                          )}
                          {r.status === 'fixed' && (
                            <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-[10px] font-bold border border-emerald-200 flex items-center gap-1 w-fit">
                              <CheckCircle className="w-3 h-3 text-emerald-600" /> Fixed
                            </span>
                          )}
                          {r.status === 'dismissed' && (
                            <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full text-[10px] font-bold border border-slate-200 flex items-center gap-1 w-fit">
                              <XCircle className="w-3 h-3" /> Dismissed
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right space-x-1.5">
                          {r.status !== 'fixed' && (
                            <button
                              onClick={() => handleUpdateStatus(r.id, 'fixed')}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition text-[11px]"
                            >
                              កែរៀបរួច (Fix)
                            </button>
                          )}
                          {r.status !== 'dismissed' && (
                            <button
                              onClick={() => handleUpdateStatus(r.id, 'dismissed')}
                              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition text-[11px]"
                            >
                              បោះបង់
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View (< md) */}
              <div className="block md:hidden divide-y divide-slate-100">
                {reports.map((r) => (
                  <div key={r.id} className="p-4 space-y-3 bg-white">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{r.content_title}</h4>
                        {r.episode_title && (
                          <span className="text-[11px] font-medium text-slate-500 block">{r.episode_title}</span>
                        )}
                      </div>
                      {r.status === 'pending' && (
                        <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[9px] font-bold border border-amber-200 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> Pending
                        </span>
                      )}
                      {r.status === 'fixed' && (
                        <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[9px] font-bold border border-emerald-200 flex items-center gap-1">
                          <CheckCircle className="w-2.5 h-2.5 text-emerald-600" /> Fixed
                        </span>
                      )}
                      {r.status === 'dismissed' && (
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[9px] font-bold border border-slate-200 flex items-center gap-1">
                          <XCircle className="w-2.5 h-2.5" /> Dismissed
                        </span>
                      )}
                    </div>

                    <div className="text-xs space-y-1 bg-red-50/50 p-2.5 rounded-xl border border-red-100">
                      <p className="font-bold text-red-700 text-xs">បញ្ហា: {r.reason}</p>
                      {r.details && <p className="text-slate-600 text-[11px]">{r.details}</p>}
                      <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-red-100/60 mt-1">
                        <span>រាយការណ៍ដោយ: <span className="font-bold text-slate-700">{r.user_name}</span> (ID: {r.user_id})</span>
                        <span className="font-mono">{new Date(r.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end space-x-2 pt-1">
                      {r.status !== 'fixed' && (
                        <button
                          onClick={() => handleUpdateStatus(r.id, 'fixed')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition text-[11px]"
                        >
                          កែរៀបរួច (Fix)
                        </button>
                      )}
                      {r.status !== 'dismissed' && (
                        <button
                          onClick={() => handleUpdateStatus(r.id, 'dismissed')}
                          className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition text-[11px]"
                        >
                          បោះបង់
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
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
    </AdminLayout>
  );
}
