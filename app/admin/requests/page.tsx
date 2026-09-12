'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { api } from '@/lib/api';
import { FileQuestion, CheckCircle2, XCircle, Clock, RefreshCw, MessageSquare, AlertCircle } from 'lucide-react';

interface MovieRequest {
  id: string;
  user_id: string;
  user_name: string;
  title: string;
  description?: string;
  genre?: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_note?: string;
  created_at: string;
}

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<MovieRequest[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [adminNoteInput, setAdminNoteInput] = useState('');

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

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAdminMovieRequests(filterStatus === 'all' ? undefined : filterStatus);
      setRequests(data || []);
    } catch {
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [filterStatus]);

  const handleUpdateStatus = async (requestId: string, status: string) => {
    try {
      await api.updateMovieRequestStatus(requestId, status, adminNoteInput);
      setEditingNoteId(null);
      setAdminNoteInput('');
      await fetchRequests();
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
            <div className="p-3 bg-brand-red/10 text-brand-red rounded-xl">
              <FileQuestion className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">
                គ្រប់គ្រងសំណើសុំរឿងថ្មី (User Movie Requests)
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                ពិនិត្យមើលរឿងភាគ ឬរឿងដុំដែលសមាជិកបានផ្ញើសំណើ និងឆ្លើយតបយល់ព្រម/បដិសេធ
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchRequests}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Status Filter Bar */}
        <div className="flex items-center space-x-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm max-w-full overflow-x-auto text-xs font-bold whitespace-nowrap">
          {['all', 'pending', 'approved', 'rejected'].map((st) => (
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
                : st === 'approved'
                ? 'បានយល់ព្រម (Approved)'
                : 'បានបដិសេធ (Rejected)'}
            </button>
          ))}
        </div>

          {/* Requests Table & Mobile Cards */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="p-12 text-center text-xs text-slate-400">កំពុងទាញយកទិន្នន័យ...</div>
            ) : requests.length === 0 ? (
              <div className="p-12 text-center space-y-2 text-slate-400">
                <FileQuestion className="w-12 h-12 mx-auto text-slate-300 opacity-50" />
                <p className="text-xs">គ្មានសំណើសុំរឿងក្នុងប្រអប់នេះទេ</p>
              </div>
            ) : (
              <>
                {/* Desktop Table View (>= md) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                        <th className="p-4">ចំណងជើងរឿងដែលស្នើសុំ</th>
                        <th className="p-4">ប្រភេទ</th>
                        <th className="p-4">អ្នកស្នើសុំ</th>
                        <th className="p-4">ការពិពណ៌នា</th>
                        <th className="p-4">កាលបរិច្ឆេទ</th>
                        <th className="p-4">ស្ថានភាព</th>
                        <th className="p-4 text-right">សកម្មភាព</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {requests.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-4 font-bold text-slate-900">{req.title}</td>
                          <td className="p-4 font-semibold text-slate-600">
                            {req.genre || 'មិនបានបញ្ជាក់'}
                          </td>
                          <td className="p-4">
                            <span className="font-semibold">{req.user_name}</span>
                            <span className="block text-[10px] text-slate-400 font-mono">
                              ID: {req.user_id}
                            </span>
                          </td>
                          <td className="p-4 text-slate-500 max-w-xs truncate">
                            {req.description || '-'}
                          </td>
                          <td className="p-4 text-slate-400 font-mono text-[11px]">
                            {new Date(req.created_at).toLocaleString([], {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </td>
                          <td className="p-4">
                            {req.status === 'pending' && (
                              <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-[10px] font-bold border border-amber-200 flex items-center gap-1 w-fit">
                                <Clock className="w-3 h-3" /> Pending
                              </span>
                            )}
                            {req.status === 'approved' && (
                              <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-[10px] font-bold border border-emerald-200 flex items-center gap-1 w-fit">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Approved
                              </span>
                            )}
                            {req.status === 'rejected' && (
                              <span className="bg-red-100 text-red-800 px-2.5 py-1 rounded-full text-[10px] font-bold border border-red-200 flex items-center gap-1 w-fit">
                                <XCircle className="w-3 h-3 text-red-500" /> Rejected
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right space-x-1.5">
                            {req.status !== 'approved' && (
                              <button
                                onClick={() => handleUpdateStatus(req.id, 'approved')}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition text-[11px]"
                              >
                                យល់ព្រម (Approve)
                              </button>
                            )}
                            {req.status !== 'rejected' && (
                              <button
                                onClick={() => handleUpdateStatus(req.id, 'rejected')}
                                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition text-[11px]"
                              >
                                បដិសេធ (Reject)
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
                  {requests.map((req) => (
                    <div key={req.id} className="p-4 space-y-3 bg-white">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{req.title}</h4>
                          <span className="text-[11px] font-semibold text-slate-500">{req.genre || 'មិនបានបញ្ជាក់'}</span>
                        </div>
                        {req.status === 'pending' && (
                          <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[9px] font-bold border border-amber-200 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" /> Pending
                          </span>
                        )}
                        {req.status === 'approved' && (
                          <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[9px] font-bold border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> Approved
                          </span>
                        )}
                        {req.status === 'rejected' && (
                          <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-[9px] font-bold border border-red-200 flex items-center gap-1">
                            <XCircle className="w-2.5 h-2.5 text-red-500" /> Rejected
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div className="flex justify-between text-[11px]">
                          <span>អ្នកស្នើសុំ: <span className="font-bold text-slate-800">{req.user_name}</span></span>
                          <span className="font-mono text-slate-400">ID: {req.user_id}</span>
                        </div>
                        {req.description && (
                          <p className="text-slate-500 text-[11px] italic mt-1">{req.description}</p>
                        )}
                        <p className="text-[10px] text-slate-400 font-mono text-right mt-1">
                          {new Date(req.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-end space-x-2 pt-1">
                        {req.status !== 'approved' && (
                          <button
                            onClick={() => handleUpdateStatus(req.id, 'approved')}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition text-[11px]"
                          >
                            យល់ព្រម (Approve)
                          </button>
                        )}
                        {req.status !== 'rejected' && (
                          <button
                            onClick={() => handleUpdateStatus(req.id, 'rejected')}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition text-[11px]"
                          >
                            បដិសេធ (Reject)
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
