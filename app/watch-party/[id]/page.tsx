'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { UserNavbar } from '@/components/user/UserNavbar';
import { UserFooter } from '@/components/user/UserFooter';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  Play,
  Pause,
  Tv,
  Users,
  MessageSquare,
  Send,
  Share2,
  Copy,
  Check,
  Film,
  Sparkles,
  ArrowLeft,
  Volume2,
  VolumeX
} from 'lucide-react';

interface WatchPartyRoom {
  room_id: string;
  movie_id: string;
  host_id: string;
  host_name: string;
  current_time: number;
  is_playing: boolean;
  created_at: string;
}

interface ChatMessage {
  id: string;
  sender_name: string;
  message: string;
  timestamp: string;
}

export default function WatchPartyPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const movieIdParam = searchParams.get('movie');
  const roomId = id as string;

  const { currentUser, isAuthenticated } = useAuth();
  const [room, setRoom] = useState<WatchPartyRoom | null>(null);
  const [movie, setMovie] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const isSyncingRef = useRef(false);

  // Initialize room & movie content
  useEffect(() => {
    const initRoom = async () => {
      let rData = await api.getWatchParty(roomId);
      if (!rData && movieIdParam) {
        // Create watch party if not exists
        try {
          const newRoom = await api.createWatchParty(movieIdParam);
          rData = await api.getWatchParty(newRoom.roomId);
        } catch {}
      }

      if (rData) {
        setRoom(rData);
        const mData = await api.getContentById(rData.movie_id);
        setMovie(mData);
      }
    };

    initRoom();
  }, [roomId, movieIdParam]);

  // Sync playback state with server
  useEffect(() => {
    if (!roomId) return;

    const pollSync = async () => {
      try {
        const latestRoom = await api.getWatchParty(roomId);
        if (latestRoom && videoRef.current) {
          setRoom(latestRoom);

          // Apply remote sync if time difference > 2.5 seconds
          const timeDiff = Math.abs(videoRef.current.currentTime - latestRoom.current_time);
          if (timeDiff > 2.5 && !isSyncingRef.current) {
            isSyncingRef.current = true;
            videoRef.current.currentTime = latestRoom.current_time;
            setTimeout(() => {
              isSyncingRef.current = false;
            }, 500);
          }

          if (latestRoom.is_playing && videoRef.current.paused && !isSyncingRef.current) {
            videoRef.current.play().catch(() => {});
          } else if (!latestRoom.is_playing && !videoRef.current.paused && !isSyncingRef.current) {
            videoRef.current.pause();
          }
        }
      } catch {}
    };

    const interval = setInterval(pollSync, 2000);
    return () => clearInterval(interval);
  }, [roomId]);

  // Sync host actions to server
  const handleHostTimeUpdate = () => {
    if (!videoRef.current || !room || currentUser?.id !== room.host_id) return;
    if (isSyncingRef.current) return;
    api.syncWatchParty(room.room_id, videoRef.current.currentTime, !videoRef.current.paused);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    const newMsg: ChatMessage = {
      id: 'wp-' + Date.now(),
      sender_name: currentUser?.name || 'ភ្ញៀវ (Guest)',
      message: inputMsg.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, newMsg]);
    setInputMsg('');

    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, 100);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-khmer">
      <UserNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 pt-24 pb-12 flex flex-col space-y-6">
        {/* Header toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-4 rounded-3xl shadow-xl">
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-2xl transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                <span className="text-xs font-black uppercase text-amber-400 tracking-wider">
                  បន្ទប់មើលរឿងជុំគ្នា (Watch Party Cinema Room)
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-black text-white">
                {movie?.title || 'កំពុងផ្ទុកទិន្នន័យរឿង...'}
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleCopyLink}
              className="px-4 py-2.5 bg-brand-red hover:bg-red-700 text-white rounded-2xl font-extrabold text-xs flex items-center space-x-2 shadow-lg shadow-brand-red/30 transition hover:scale-105 active:scale-95"
            >
              {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'បានចម្លងតំណភ្ជាប់រចនាសម្ព័ន្ធ!' : 'អញ្ជើញមិត្តភក្តិ (Share Link)'}</span>
            </button>
          </div>
        </div>

        {/* Video & Chat Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 items-start">
          {/* Main Video Sync Player */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-800 group">
              {movie?.videoUrl ? (
                <video
                  ref={videoRef}
                  src={movie.videoUrl}
                  controls
                  onTimeUpdate={handleHostTimeUpdate}
                  onPlay={handleHostTimeUpdate}
                  onPause={handleHostTimeUpdate}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-3">
                  <Film className="w-16 h-16 animate-bounce opacity-40" />
                  <span className="text-sm font-bold">កំពុងរៀបចំប្រព័ន្ធ Cinema Sync...</span>
                </div>
              )}
            </div>

            {/* Room Information Bar */}
            <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-3xl space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-3">
                <span className="flex items-center gap-1.5 font-bold text-slate-200">
                  <Users className="w-4 h-4 text-brand-red" />
                  <span>ម្ចាស់បន្ទប់: {room?.host_name || 'Admin'}</span>
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 font-mono text-[10px] px-2 py-0.5 rounded border border-emerald-500/30">
                  Status: SYNCED
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                {movie?.description || 'រីករាយជាមួយការមើលរឿងភាគ និងភាពយន្តជុំគ្នាជាមួយមិត្តភក្តិ!'}
              </p>
            </div>
          </div>

          {/* Embedded Real-time Room Chat Sidebar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 flex flex-col h-[520px] shadow-2xl">
            <div className="flex items-center space-x-2 pb-4 border-b border-slate-800">
              <MessageSquare className="w-5 h-5 text-brand-red" />
              <h3 className="text-sm font-extrabold text-white">ឆាតក្នុងបន្ទប់ (Party Chat)</h3>
            </div>

            {/* Messages Scroll Area */}
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto space-y-3 py-4 pr-1">
              {chatMessages.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-500 space-y-2">
                  <MessageSquare className="w-8 h-8 mx-auto opacity-30" />
                  <p>មិនទាន់មានសារក្នុងបន្ទប់នៅឡើយទេ។ ចាប់ផ្ដើមឆាតនិយាយគ្នាមុនគេ!</p>
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div key={msg.id} className="bg-slate-950 p-3 rounded-2xl border border-slate-800/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200">{msg.sender_name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{msg.timestamp}</span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium">{msg.message}</p>
                  </div>
                ))
              )}
            </div>

            {/* Chat Input Form */}
            <form onSubmit={handleSendMessage} className="flex items-center space-x-2 pt-2 border-t border-slate-800">
              <input
                type="text"
                placeholder="សរសេរសារក្នុងបន្ទប់..."
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                className="flex-1 bg-slate-950 text-slate-100 text-xs px-4 py-2.5 rounded-2xl border border-slate-800 focus:outline-none focus:border-brand-red font-medium placeholder-slate-500"
              />
              <button
                type="submit"
                disabled={!inputMsg.trim()}
                className="p-2.5 bg-brand-red hover:bg-red-700 text-white rounded-2xl transition disabled:opacity-50 shadow-md shadow-brand-red/20"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </main>

      <UserFooter />
    </div>
  );
}
