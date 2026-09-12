'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  MessageSquare,
  Search,
  Send,
  User,
  Trash2,
  RefreshCw,
  Headphones,
  Shield,
  Clock,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  Film,
  Paperclip,
  Mic,
  Square,
  Download,
  X,
  Phone,
  PhoneCall,
  PhoneOff,
  MicOff,
  Reply,
  ArrowLeft,
  ArrowDown
} from 'lucide-react';

interface SupportConversation {
  user_id: string;
  user_name: string;
  user_avatar?: string;
  last_message: string;
  last_timestamp: string;
  last_sender_id: string;
}

interface ChatMessage {
  id: string;
  room_type: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  recipient_id?: string;
  message: string;
  media_url?: string;
  media_type?: string;
  timestamp: string;
  reply_to_id?: string;
  reply_to_sender?: string;
  reply_to_text?: string;
}

export default function AdminSupportPage() {
  const { currentUser } = useAuth();
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'threads' | 'chat'>('threads');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputMessage, setInputMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const isScrolledUpRef = useRef(false);

  // Voice Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  // Hidden File Inputs
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight + 1000,
        behavior
      });
      isScrolledUpRef.current = false;
      setIsScrolledUp(false);
    }
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: 'end' });
    }
  };

  const fetchConversations = async () => {
    try {
      const data = await api.getSupportConversations();
      setConversations(data || []);
      if (!selectedUserId && data && data.length > 0) {
        setSelectedUserId(data[0].user_id);
      }
    } catch (err: any) {
      setErrorMsg('មិនអាចទាញយកបញ្ជីឆាតជំនួយបានទេ');
    } finally {
      setIsLoadingThreads(false);
    }
  };

  const fetchMessagesForUser = async (userId: string, isInitial = false) => {
    if (!userId) return;
    try {
      if (isInitial) setIsLoadingMessages(true);
      const msgs = await api.getChatMessages('SUPPORT', userId);
      setMessages(msgs || []);

      if (isInitial || !isScrolledUpRef.current) {
        setTimeout(() => {
          scrollToBottom(isInitial ? 'auto' : 'smooth');
        }, 60);
      }
    } catch {
      setErrorMsg('មិនអាចទាញយកសារឆាតបានទេ');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const scrolledUp = scrollHeight - scrollTop - clientHeight > 120;
    isScrolledUpRef.current = scrolledUp;
    setIsScrolledUp(scrolledUp);
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      isScrolledUpRef.current = false;
      setIsScrolledUp(false);
      fetchMessagesForUser(selectedUserId, true);
      const interval = setInterval(() => fetchMessagesForUser(selectedUserId, false), 2500);
      return () => clearInterval(interval);
    }
  }, [selectedUserId]);

  useEffect(() => {
    if (messages.length > 0 && !isScrolledUpRef.current) {
      scrollToBottom('smooth');
    }
  }, [messages.length]);

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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !selectedUserId || isSending) return;

    setIsSending(true);
    try {
      await api.sendChatMessage(
        inputMessage.trim(),
        'SUPPORT',
        selectedUserId,
        undefined,
        undefined,
        replyingTo?.id,
        replyingTo?.sender_name,
        replyingTo?.message
      );
      setInputMessage('');
      setReplyingTo(null);
      isScrolledUpRef.current = false;
      await fetchMessagesForUser(selectedUserId, true);
      await fetchConversations();
    } catch (err: any) {
      showAlert('បរាជ័យ', err.message || 'បរាជ័យក្នុងការផ្ញើសារ');
    } finally {
      setIsSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedUserId) return;

    setIsSending(true);
    try {
      const uploadRes = await api.uploadChatFile(file);
      await api.sendChatMessage('', 'SUPPORT', selectedUserId, uploadRes.url, uploadRes.mediaType);
      await fetchMessagesForUser(selectedUserId);
      await fetchConversations();
    } catch (err: any) {
      showAlert('បរាជ័យ', err.message || 'បរាជ័យក្នុងការ Upload ឯកសារ');
    } finally {
      setIsSending(false);
      e.target.value = '';
    }
  };

  const startRecording = async () => {
    if (!selectedUserId) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());
        if (audioBlob.size > 0) {
          handleSendMediaBlob(audioBlob, 'voice_note.webm');
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      showAlert('បរាជ័យ', 'មិនអាចបើកមីក្រូហ្វូនបានទេ! (Microphone permission denied)');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      audioChunksRef.current = [];
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
    }
  };

  const handleSendMediaBlob = async (blob: Blob, filename: string) => {
    if (!selectedUserId) return;
    setIsSending(true);
    try {
      const uploadRes = await api.uploadChatFile(blob, filename);
      await api.sendChatMessage('', 'SUPPORT', selectedUserId, uploadRes.url, 'audio');
      await fetchMessagesForUser(selectedUserId);
      await fetchConversations();
    } catch (err: any) {
      showAlert('បរាជ័យ', err.message || 'បរាជ័យក្នុងការផ្ញើសារសំឡេង');
    } finally {
      setIsSending(false);
    }
  };

  const [deleteConfirmMsgId, setDeleteConfirmMsgId] = useState<string | null>(null);

  const handleDeleteMessage = (msgId: string) => {
    setDeleteConfirmMsgId(msgId);
  };

  const confirmDeleteMessage = async () => {
    if (!deleteConfirmMsgId) return;
    const msgId = deleteConfirmMsgId;
    setDeleteConfirmMsgId(null);
    try {
      await api.deleteChatMessage(msgId);
      if (selectedUserId) fetchMessagesForUser(selectedUserId);
    } catch (err: any) {
      setErrorMsg(err.message || 'បរាជ័យក្នុងការលុបសារ');
    }
  };

  const selectedConversation = conversations.find((c) => c.user_id === selectedUserId);

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.user_id.toLowerCase().includes(q) ||
      c.user_name.toLowerCase().includes(q) ||
      c.last_message.toLowerCase().includes(q)
    );
  });

  return (
    <AdminLayout>
      {/* Hidden File Inputs */}
      <input type="file" ref={photoInputRef} accept="image/*" onChange={handleFileUpload} className="hidden" />
      <input type="file" ref={videoInputRef} accept="video/*" onChange={handleFileUpload} className="hidden" />
      <input type="file" ref={fileInputRef} accept="*/*" onChange={handleFileUpload} className="hidden" />

      <div className="p-2 sm:p-6 max-w-7xl mx-auto space-y-3 sm:space-y-6 font-khmer">
        {/* Page Header */}
        <div className="hidden lg:flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-red-50 text-brand-red rounded-xl">
              <Headphones className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">
                ប្រព័ន្ធឆាតគាំទ្រអតិថិជន (Admin Support Inbox)
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                មើលសារដែលអតិថិជនបានឆាតមកកាន់ Support ឆ្លើយតបសារ ផ្ញើសំឡេង រូបភាព វីដេអូ ឬឯកសារ
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              fetchConversations();
              if (selectedUserId) fetchMessagesForUser(selectedUserId);
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
          >
            <RefreshCw className="w-4 h-4" />
            <span>ធ្វើបច្ចុប្បន្នភាព (Refresh)</span>
          </button>
        </div>

        {errorMsg && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Messenger Main Grid */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[450px] h-[calc(100vh-160px)] sm:h-[calc(100vh-180px)] lg:h-[calc(100vh-200px)]">
          {/* LEFT USER LIST SIDEBAR */}
          <div className={`lg:col-span-4 border-r border-slate-200 flex flex-col bg-slate-50 h-full min-h-0 min-w-0 ${mobileTab === 'chat' ? 'hidden lg:flex' : 'flex'}`}>
            {/* Search Input */}
            <div className="p-4 border-b border-slate-200 bg-white">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="ស្វែងរកតាម ID ឬឈ្មោះអតិថិជន..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-100 text-xs text-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:bg-white border border-slate-200 font-medium"
                />
              </div>
            </div>

            {/* Conversation Threads List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {isLoadingThreads ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  កំពុងទាញយកបញ្ជីសារ...
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <MessageSquare className="w-10 h-10 mx-auto opacity-30 text-slate-400" />
                  <p className="text-xs">មិនទាន់មានសារ Support ពីអតិថិជននៅឡើយទេ</p>
                </div>
              ) : (
                filteredConversations.map((thread) => {
                  const isSelected = selectedUserId === thread.user_id;
                  const isUserSender = thread.last_sender_id === thread.user_id;
                  return (
                    <button
                      key={thread.user_id}
                      onClick={() => {
                        setSelectedUserId(thread.user_id);
                        setMobileTab('chat');
                      }}
                      className={`w-full text-left p-4 flex items-start space-x-3 transition-all ${
                        isSelected
                          ? 'bg-red-50/80 border-l-4 border-brand-red shadow-sm'
                          : 'hover:bg-slate-100/70 bg-white'
                      }`}
                    >
                      <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-slate-800 text-white font-black text-xs flex items-center justify-center border border-slate-300">
                          {thread.user_name.substring(0, 2).toUpperCase()}
                        </div>
                        {isUserSender && (
                          <span className="w-3 h-3 bg-red-500 rounded-full absolute -top-0.5 -right-0.5 border-2 border-white animate-pulse" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-800 truncate">
                            {thread.user_name}
                          </h4>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(thread.last_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-1">
                          <span className="bg-slate-200 text-slate-700 text-[9px] font-extrabold px-1.5 py-0.2 rounded font-mono">
                            ID: {thread.user_id}
                          </span>
                        </div>
                        <p className={`text-xs mt-1 truncate ${isUserSender ? 'font-bold text-slate-900' : 'text-slate-500'}`}>
                          {isUserSender ? '' : 'អ្នក: '}
                          {thread.last_message || '[Media Attachment]'}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT CHAT MAIN PANEL */}
          <div className={`lg:col-span-8 flex flex-col bg-white h-full min-h-0 min-w-0 ${mobileTab === 'threads' ? 'hidden lg:flex' : 'flex'}`}>
            {selectedUserId && selectedConversation ? (
              <>
                {/* Active Chat Header */}
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-shrink-0 z-10">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setMobileTab('threads')}
                      className="lg:hidden p-2 text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-xl transition flex items-center gap-1 text-xs font-bold"
                      title="ត្រឡប់ទៅបញ្ជីសារ"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span className="hidden sm:inline">ត្រឡប់</span>
                    </button>
                    <div className="w-10 h-10 rounded-full bg-slate-800 text-white font-black text-xs flex items-center justify-center border border-slate-300 flex-shrink-0">
                      {selectedConversation.user_name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <span>{selectedConversation.user_name}</span>
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded border border-amber-200 font-mono">
                          ID: {selectedUserId}
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>អតិថិជនកំពុងរង់ចាំការឆ្លើយតបពី Support</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Messages Body */}
                <div className="relative flex-1 min-h-0 bg-slate-50/50 overflow-hidden">
                  <div
                    ref={chatContainerRef}
                    onScroll={handleScroll}
                    className="h-full p-3 sm:p-6 pb-12 sm:pb-16 overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y space-y-4"
                  >
                    {isLoadingMessages && messages.length === 0 ? (
                      <div className="text-center py-12 text-xs text-slate-400">
                        កំពុងទាញយកសារ...
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="text-center py-12 text-xs text-slate-400">
                        មិនទាន់មានសារក្នុងប្រអប់នេះនៅឡើយទេ
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isAdmin = msg.sender_id.startsWith('admin') || msg.sender_id === currentUser?.id;
                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'} group max-w-full`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-extrabold text-slate-500">
                                {isAdmin ? 'អ្នក (Admin Support)' : `${msg.sender_name} (ID: ${msg.sender_id})`}
                              </span>
                              <span className="text-[9px] text-slate-400">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 max-w-[90%] sm:max-w-[85%]">
                              <button
                                onClick={() => setReplyingTo(msg)}
                                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-amber-500 p-1 transition flex-shrink-0"
                                title="ឆ្លើយតបសារនេះ (Reply)"
                              >
                                <Reply className="w-3.5 h-3.5" />
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={() => handleDeleteMessage(msg.id)}
                                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-1 transition flex-shrink-0"
                                  title="លុបសារនេះ"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <div
                                className={`rounded-2xl text-xs font-medium leading-relaxed shadow-sm min-w-0 break-words ${
                                  msg.media_url && !msg.message
                                    ? ''
                                    : isAdmin
                                    ? 'p-3 sm:p-3.5 bg-brand-red text-white rounded-br-none font-sans'
                                    : 'p-3 sm:p-3.5 bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                                }`}
                              >
                                {/* Quoted Reply Preview */}
                                {msg.reply_to_text && (
                                  <div className={`text-xs p-2.5 rounded-xl mb-2 border-l-4 text-left ${
                                    isAdmin
                                      ? 'bg-red-800/80 border-amber-300 text-slate-100'
                                      : 'bg-slate-100 border-brand-red text-slate-700'
                                  }`}>
                                    <div className="font-bold text-[10px] text-amber-400 flex items-center gap-1 mb-0.5">
                                      <Reply className="w-3 h-3" />
                                      <span>{msg.reply_to_sender || 'សារ'}</span>
                                    </div>
                                    <div className="truncate text-[11px] opacity-90">{msg.reply_to_text}</div>
                                  </div>
                                )}

                                {msg.message && (
                                  <div
                                    className={
                                      msg.media_url
                                        ? isAdmin
                                          ? 'p-3 sm:p-3.5 bg-brand-red text-white rounded-2xl shadow-sm mb-2 break-words'
                                          : 'p-3 sm:p-3.5 bg-white border border-slate-200 text-slate-800 rounded-2xl shadow-sm mb-2 break-words'
                                        : 'break-words'
                                    }
                                  >
                                    {msg.message}
                                  </div>
                                )}

                                {/* Media Attachment Rendering */}
                                {msg.media_url && (
                                  <div className="overflow-hidden">
                                    {msg.media_type === 'image' && (
                                      <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className="block">
                                        <img
                                          src={msg.media_url}
                                          alt="Photo attachment"
                                          className="w-full max-w-[240px] sm:max-w-xs max-h-56 rounded-xl border border-slate-300 object-cover hover:opacity-90 transition cursor-pointer shadow-sm"
                                        />
                                      </a>
                                    )}

                                    {msg.media_type === 'video' && (
                                      <video
                                        controls
                                        src={msg.media_url}
                                        className="w-full max-w-[240px] sm:max-w-xs max-h-56 rounded-xl border border-slate-300 shadow-sm block"
                                      />
                                    )}

                                    {msg.media_type === 'audio' && (
                                      <div className="flex items-center gap-2 bg-white border border-slate-200 p-2 rounded-full shadow-md text-slate-800 max-w-[240px] sm:max-w-xs">
                                        <audio controls src={msg.media_url} className="w-full max-w-[220px] h-10" />
                                      </div>
                                    )}

                                    {msg.media_type === 'file' && (
                                      <a
                                        href={msg.media_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        download
                                        className="flex items-center gap-2.5 bg-slate-100 text-slate-800 p-3 rounded-xl border border-slate-200 hover:bg-slate-200 transition text-xs font-semibold shadow-sm"
                                      >
                                        <Paperclip className="w-4 h-4 text-brand-red flex-shrink-0" />
                                        <span className="truncate max-w-[160px]">ទាញយកឯកសារ (Download File)</span>
                                        <Download className="w-4 h-4 ml-auto text-slate-500" />
                                      </a>
                                    )}
                                  </div>
                                )}
                              </div>
                              {!isAdmin && (
                                <button
                                  onClick={() => handleDeleteMessage(msg.id)}
                                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-1 transition"
                                  title="លុបសារនេះ"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} className="h-6 w-full" />
                  </div>

                  {/* Scroll to Bottom Floating Button */}
                  {isScrolledUp && (
                    <button
                      onClick={() => scrollToBottom('smooth')}
                      className="absolute bottom-4 right-4 p-2.5 bg-brand-red text-white rounded-full shadow-xl hover:bg-red-700 transition-all transform hover:scale-105 z-20 flex items-center gap-1.5 text-xs font-bold"
                      title="អូសចុះក្រោមបង្អស់ (Scroll to bottom)"
                    >
                      <ArrowDown className="w-4 h-4 animate-bounce" />
                      <span className="hidden sm:inline">សារថ្មីៗ</span>
                    </button>
                  )}
                </div>

                {/* Admin Message Input Footer */}
                <div className="flex-shrink-0 p-3 sm:p-4 border-t border-slate-200 bg-white space-y-2 z-10">
                  {/* Reply Preview Banner */}
                  {replyingTo && (
                    <div className="flex items-center justify-between bg-slate-100 border-l-4 border-brand-red p-2.5 rounded-xl text-xs text-slate-800 shadow-sm">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-brand-red flex items-center gap-1.5 text-[11px]">
                          <Reply className="w-3.5 h-3.5" />
                          <span>កំពុងឆ្លើយតបទៅកាន់ {replyingTo.sender_name}</span>
                        </div>
                        <div className="truncate text-slate-500 text-[11px] mt-0.5">
                          {replyingTo.message || (replyingTo.media_url ? '[ឯកសារភ្ជាប់ / Media]' : 'សារ')}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReplyingTo(null)}
                        className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition"
                        title="បោះបង់ (Cancel)"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {isRecording ? (
                    <div className="flex items-center justify-between bg-red-50 border border-red-300 p-2.5 sm:p-3 rounded-xl text-red-800 text-xs animate-pulse">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                        <span className="font-bold text-[11px] sm:text-xs">កំពុងថត... {recordingSeconds}s</span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <button
                          type="button"
                          onClick={cancelRecording}
                          className="px-2.5 sm:px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold flex items-center gap-1 text-[11px] sm:text-xs transition"
                        >
                          <X className="w-3.5 h-3.5" /> បោះបង់
                        </button>
                        <button
                          type="button"
                          onClick={stopRecording}
                          className="px-3 sm:px-4 py-1.5 bg-brand-red hover:bg-red-700 text-white rounded-xl font-bold flex items-center gap-1 text-[11px] sm:text-xs transition shadow-md"
                        >
                          <Square className="w-3.5 h-3.5" /> ផ្ញើ
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSendMessage} className="flex items-center space-x-1.5 sm:space-x-2">
                      {/* Attachment Buttons */}
                      <div className="flex items-center space-x-0.5 sm:space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => photoInputRef.current?.click()}
                          disabled={isSending}
                          className="p-1.5 sm:p-2 text-slate-500 hover:text-brand-red hover:bg-white rounded-lg transition"
                          title="ផ្ញើរូបភាព (Send Photo)"
                        >
                          <ImageIcon className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => videoInputRef.current?.click()}
                          disabled={isSending}
                          className="p-1.5 sm:p-2 text-slate-500 hover:text-brand-red hover:bg-white rounded-lg transition"
                          title="ផ្ញើវីដេអូ (Send Video)"
                        >
                          <Film className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isSending}
                          className="p-1.5 sm:p-2 text-slate-500 hover:text-brand-red hover:bg-white rounded-lg transition"
                          title="ផ្ញើឯកសារ (Send File)"
                        >
                          <Paperclip className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={startRecording}
                          disabled={isSending}
                          className="p-1.5 sm:p-2 text-slate-500 hover:text-brand-red hover:bg-white rounded-lg transition"
                          title="ថតសំឡេង (Record Voice Note)"
                        >
                          <Mic className="w-4 h-4" />
                        </button>
                      </div>

                      <input
                        type="text"
                        placeholder="សរសេរសារឆ្លើយតប..."
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        className="flex-1 min-w-0 bg-slate-100 border border-slate-200 text-slate-800 text-xs px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-red/40 focus:bg-white font-medium"
                      />
                      <button
                        type="submit"
                        disabled={isSending || !inputMessage.trim()}
                        className="px-3.5 sm:px-5 py-2.5 sm:py-3 bg-brand-red hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 shadow-sm flex-shrink-0"
                        title="ផ្ញើសារ (Send Message)"
                      >
                        <Send className="w-4 h-4" />
                        <span className="hidden sm:inline">ផ្ញើសារ</span>
                      </button>
                    </form>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400 space-y-3">
                <Headphones className="w-16 h-16 opacity-20 text-slate-400" />
                <h3 className="text-sm font-bold text-slate-600">
                  សូមជ្រើសរើសអតិថិជនពីបញ្ជីខាងឆ្វេងដើម្បីចូលមើល និងឆ្លើយតបឆាត Support
                </h3>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CUSTOM CONFIRMATION MODAL PORTAL */}
      {deleteConfirmMsgId && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-sm sm:max-w-md w-full text-center space-y-5 shadow-2xl text-white transform transition-all animate-scale-in">
            <div className="relative inline-block">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto border bg-red-500/10 border-red-500/30 text-red-500">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-white">លុបសារនេះ? (Delete Message)</h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 font-medium leading-relaxed">
                តើអ្នកពិតជាចង់លុបសារនេះមែនទេ?
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmMsgId(null)}
                className="flex-1 py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm transition cursor-pointer border border-slate-700"
              >
                បោះបង់ (Cancel)
              </button>
              <button
                type="button"
                onClick={confirmDeleteMessage}
                className="flex-1 py-3 px-4 rounded-2xl text-white font-bold text-xs sm:text-sm transition shadow-lg cursor-pointer bg-red-600 hover:bg-red-700 shadow-red-600/30"
              >
                លុបសារ (Delete)
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
    </AdminLayout>
  );
}
