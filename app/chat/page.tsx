'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import {
  MessageSquare,
  Users,
  User,
  Send,
  Trash2,
  Shield,
  AlertCircle,
  RefreshCw,
  ArrowDown,
  UserCheck,
  Search,
  Headphones,
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
  Video,
  VideoOff,
  Reply,
  Ban,
  Minimize2,
  Maximize2,
  Volume2,
  VolumeX
} from 'lucide-react';
import { UserNavbar } from '@/components/user/UserNavbar';
import { UserFooter } from '@/components/user/UserFooter';

interface ChatMessage {
  id: string;
  room_type: 'GROUP' | 'PRIVATE' | 'SUPPORT';
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

interface ChatUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  status: string;
}

export default function LiveChatPage() {
  const { currentUser, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'GROUP' | 'PRIVATE' | 'SUPPORT'>('GROUP');
  const [recipientId, setRecipientId] = useState<string>('admin-1'); // Default private chat target
  const [mobilePrivateTab, setMobilePrivateTab] = useState<'users' | 'chat'>('users');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [inputMessage, setInputMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const isScrolledUpRef = useRef(false);

  // Custom Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'info';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const askConfirmation = (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText = 'យល់ព្រម (Confirm)',
    type: 'danger' | 'info' = 'danger'
  ) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmText,
      cancelText: 'បោះបង់ (Cancel)',
      type,
      onConfirm: () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        onConfirm();
      },
    });
  };

  const showAlert = (title: string, message: string) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmText: 'យល់ព្រម',
      cancelText: '',
      type: 'info',
      onConfirm: () => setConfirmModal((prev) => ({ ...prev, isOpen: false })),
    });
  };

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  // Hidden file input refs
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentUser?.status === 'banned') {
      setActiveTab('SUPPORT');
    }
  }, [currentUser]);

  const fetchUsersList = async () => {
    try {
      const usersData = await api.getChatUsers();
      if (usersData && usersData.length > 0) {
        setChatUsers(usersData);
        const otherUser = usersData.find((u: ChatUser) => u.id !== currentUser?.id) || usersData[0];
        if (otherUser && (recipientId === 'admin-1' || !recipientId || recipientId === currentUser?.id)) {
          setRecipientId(otherUser.id);
        }
      }
    } catch {
      setChatUsers([
        { id: 'admin-1', name: 'Master Admin', email: 'admin@stream.com', role: 'ADMIN', status: 'active' }
      ]);
    }
  };

  const latestRequestKeyRef = useRef<string>('');

  const getTargetRecipient = () => {
    if (activeTab === 'PRIVATE') return recipientId;
    if (activeTab === 'SUPPORT') {
      if (currentUser?.role === 'ADMIN') {
        return recipientId && recipientId !== 'admin' ? recipientId : undefined;
      }
      return 'admin';
    }
    return undefined;
  };

  const fetchMessages = async (isInitial = false) => {
    const targetRecipient = getTargetRecipient();
    const requestKey = `${activeTab}_${targetRecipient || ''}`;

    try {
      const data = await api.getChatMessages(activeTab, targetRecipient);
      if (latestRequestKeyRef.current === requestKey) {
        setMessages(data || []);
        setErrorMsg('');

        if (isInitial || !isScrolledUpRef.current) {
          setTimeout(() => {
            if (chatContainerRef.current) {
              chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            }
          }, 50);
        }
      }
    } catch (err: any) {
      if (latestRequestKeyRef.current === requestKey) {
        setErrorMsg(err.message || 'មិនអាចទាញយកសារបានទេ');
      }
    } finally {
      if (latestRequestKeyRef.current === requestKey) {
        setIsLoading(false);
      }
    }
  };

  // WebRTC Voice Call States
  const [callState, setCallState] = useState<'idle' | 'calling' | 'incoming' | 'connected'>('idle');
  const [callPeerInfo, setCallPeerInfo] = useState<{ id: string; name: string; avatar?: string }>({ id: '', name: '' });
  const [callSeconds, setCallSeconds] = useState(0);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isCallMinimized, setIsCallMinimized] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  const rtcRef = useRef<RTCPeerConnection | null>(null);
  const localAudioStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const pendingSignalRef = useRef<any>(null);
  const callTimerRef = useRef<any>(null);
  const ringtoneIntervalRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ringTimeoutRef = useRef<any>(null);

  const startRingtone = () => {
    try {
      stopRingtone();
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const playTone = () => {
        try {
          if (!ctx || ctx.state === 'closed') return;
          if (ctx.state === 'suspended') {
            ctx.resume();
          }
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();

          osc1.type = 'sine';
          osc2.type = 'sine';
          osc1.frequency.setValueAtTime(440, ctx.currentTime);
          osc2.frequency.setValueAtTime(480, ctx.currentTime);

          gain.gain.setValueAtTime(0.35, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);

          osc1.start();
          osc2.start();
          osc1.stop(ctx.currentTime + 1.8);
          osc2.stop(ctx.currentTime + 1.8);
        } catch {}
      };

      playTone();
      ringtoneIntervalRef.current = setInterval(playTone, 2500);
    } catch {}
  };

  const stopRingtone = () => {
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch {}
      audioCtxRef.current = null;
    }
  };

  useEffect(() => {
    if (callState === 'calling' || callState === 'incoming') {
      startRingtone();
      if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = setTimeout(() => {
        if (callState === 'calling' || callState === 'incoming') {
          stopRingtone();
          endVoiceCall(true);
          showAlert('ការខលផុតកំណត់', 'ការខលត្រូវបានបដិសេធដោយស្វ័យប្រវត្តិ ដោយសារគ្មានការឆ្លើយតបរយៈពេល 2 នាទី (Call timed out after 2 minutes)');
        }
      }, 120000);
    } else {
      stopRingtone();
      if (ringTimeoutRef.current) {
        clearTimeout(ringTimeoutRef.current);
        ringTimeoutRef.current = null;
      }
    }

    return () => {
      stopRingtone();
      if (ringTimeoutRef.current) {
        clearTimeout(ringTimeoutRef.current);
        ringTimeoutRef.current = null;
      }
    };
  }, [callState]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const checkSignals = async () => {
      const signals = await api.getCallSignals();
      if (signals && signals.length > 0) {
        for (const sig of signals) {
          if (sig.type === 'offer') {
            pendingSignalRef.current = sig;
            setCallPeerInfo({ id: sig.callerId, name: sig.callerName });
            setCallState('incoming');
          } else if (sig.type === 'answer' && rtcRef.current) {
            stopRingtone();
            try {
              await rtcRef.current.setRemoteDescription(new RTCSessionDescription(sig.sdp));
              setCallState('connected');
            } catch (err) {
              console.warn('Error setting remote description:', err);
            }
          } else if (sig.type === 'ice-candidate' && rtcRef.current) {
            try {
              if (sig.candidate) {
                await rtcRef.current.addIceCandidate(new RTCIceCandidate(sig.candidate));
              }
            } catch (err) {
              console.warn('Error adding ice candidate:', err);
            }
          } else if (sig.type === 'reject' || sig.type === 'end') {
            endVoiceCall(false);
          }
        }
      }
    };

    const interval = setInterval(checkSignals, 800);
    return () => clearInterval(interval);
  }, [isAuthenticated, callState]);

  const startVoiceCall = async () => {
    if (activeTab === 'SUPPORT') return;
    const targetId = activeTab === 'GROUP' ? (chatUsers[0]?.id || 'user-1') : recipientId;
    const peerName = activeTab === 'GROUP' ? 'បន្ទប់និយាយរួម (Global Group)' : (activeRecipient.name || 'User');
    if (!targetId || targetId === currentUser?.id) {
      setErrorMsg('សូមជ្រើសរើសសមាជិកដើម្បីខល!');
      return;
    }

    try {
      setCallState('calling');
      setCallPeerInfo({ id: targetId, name: peerName });

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        setIsCameraOn(true);
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        setIsCameraOn(false);
      }
      localAudioStreamRef.current = stream;

      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      rtcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          api.sendCallSignal(targetId, 'ice-candidate', undefined, event.candidate);
        }
      };

      pc.ontrack = (event) => {
        if (event.streams[0]) {
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
          if (remoteAudioRef.current) remoteAudioRef.current.srcObject = event.streams[0];
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await api.sendCallSignal(targetId, 'offer', offer);
    } catch (err) {
      setErrorMsg('មិនអាចបើកមីក្រូហ្វូន/កាមេរ៉ា សម្រាប់ខលបានទេ!');
      setCallState('idle');
    }
  };

  const acceptVoiceCall = async () => {
    const sig = pendingSignalRef.current;
    if (!sig) return;

    try {
      stopRingtone();
      setCallState('connected');
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        setIsCameraOn(true);
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        setIsCameraOn(false);
      }
      localAudioStreamRef.current = stream;

      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      rtcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          api.sendCallSignal(sig.callerId, 'ice-candidate', undefined, event.candidate);
        }
      };

      pc.ontrack = (event) => {
        if (event.streams[0]) {
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
          if (remoteAudioRef.current) remoteAudioRef.current.srcObject = event.streams[0];
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(sig.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await api.sendCallSignal(sig.callerId, 'answer', answer);
    } catch (err) {
      setErrorMsg('មិនអាចទទួលការខលបានទេ!');
      endVoiceCall();
    }
  };

  const declineVoiceCall = () => {
    stopRingtone();
    if (pendingSignalRef.current) {
      const callerId = pendingSignalRef.current.callerId;
      api.sendCallSignal(callerId, 'reject');
      const logRoomType = activeTab === 'SUPPORT' ? 'SUPPORT' : 'PRIVATE';
      api.sendChatMessage('Missed audio call', logRoomType, callerId, undefined, 'missed_call');
    }
    endVoiceCall(false);
  };

  const endVoiceCall = (notify = true) => {
    stopRingtone();
    const currentPeerId = callPeerInfo.id;
    const currentState = callState;
    const durationSecs = callSeconds;

    if (notify && currentPeerId) {
      api.sendCallSignal(currentPeerId, 'end');
      const logRoomType = activeTab === 'SUPPORT' ? 'SUPPORT' : 'PRIVATE';
      if (currentState === 'calling') {
        api.sendChatMessage('Missed audio call', logRoomType, currentPeerId, undefined, 'missed_call');
      } else if (currentState === 'connected') {
        const mins = Math.floor(durationSecs / 60).toString().padStart(2, '0');
        const secs = (durationSecs % 60).toString().padStart(2, '0');
        api.sendChatMessage(`Audio call ended (${mins}:${secs})`, logRoomType, currentPeerId, undefined, 'call_ended');
      }
    }

    if (localAudioStreamRef.current) {
      localAudioStreamRef.current.getTracks().forEach((track) => track.stop());
      localAudioStreamRef.current = null;
    }
    if (rtcRef.current) {
      try { rtcRef.current.close(); } catch {}
      rtcRef.current = null;
    }
    setCallState('idle');
    setCallPeerInfo({ id: '', name: '' });
    setIsCallMinimized(false);
    setIsSpeakerOn(true);
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
  };

  const toggleCallMic = () => {
    if (localAudioStreamRef.current) {
      const audioTrack = localAudioStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleCallCamera = async () => {
    if (!localAudioStreamRef.current) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localAudioStreamRef.current = stream;
        setIsCameraOn(true);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        setErrorMsg('មិនអាចបើកកាមេរ៉ាបានទេ! (Camera permission denied or camera not found)');
      }
      return;
    }

    const videoTracks = localAudioStreamRef.current.getVideoTracks();
    if (videoTracks.length > 0) {
      const videoTrack = videoTracks[0];
      const nextState = !videoTrack.enabled;
      videoTrack.enabled = nextState;
      setIsCameraOn(nextState);
    } else {
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const videoTrack = videoStream.getVideoTracks()[0];
        if (videoTrack) {
          localAudioStreamRef.current.addTrack(videoTrack);
          if (rtcRef.current) {
            rtcRef.current.addTrack(videoTrack, localAudioStreamRef.current);
          }
          setIsCameraOn(true);
        }
      } catch (err) {
        setErrorMsg('មិនអាចបើកកាមេរ៉ាបានទេ! (Camera permission denied or camera not found)');
      }
    }
  };

  // Video element binding effect
  useEffect(() => {
    if (callState === 'connected' || callState === 'calling') {
      if (localVideoRef.current && localAudioStreamRef.current) {
        localVideoRef.current.srcObject = localAudioStreamRef.current;
      }
    }
  }, [callState, isCameraOn]);

  // Isolated Call Duration Timer Effect
  useEffect(() => {
    if (callState === 'connected') {
      setCallSeconds(0);
      callTimerRef.current = setInterval(() => {
        setCallSeconds((prev) => prev + 1);
      }, 1000);
    } else if (callState === 'idle') {
      setCallSeconds(0);
    }
    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    };
  }, [callState]);

  useEffect(() => {
    if (callState === 'calling') {
      const timeout = setTimeout(() => {
        if (callPeerInfo.id) {
          api.sendChatMessage('Missed audio call', activeTab, callPeerInfo.id, undefined, 'missed_call');
        }
        endVoiceCall(true);
      }, 25000);
      return () => clearTimeout(timeout);
    }
  }, [callState, callPeerInfo.id]);

  useEffect(() => {
    fetchUsersList();
  }, [isAuthenticated]);

  useEffect(() => {
    const targetRecipient = getTargetRecipient();
    const requestKey = `${activeTab}_${targetRecipient || ''}`;
    latestRequestKeyRef.current = requestKey;

    setMessages([]);
    setIsLoading(true);
    isScrolledUpRef.current = false;

    fetchMessages(true);
    const interval = setInterval(() => fetchMessages(false), 2500); // Poll every 2.5s
    return () => clearInterval(interval);
  }, [activeTab, recipientId, currentUser?.id]);

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isScrolledUp = scrollHeight - scrollTop - clientHeight > 120;
    isScrolledUpRef.current = isScrolledUp;
    setShowScrollBottomBtn(isScrolledUp);
  };

  const scrollToBottom = () => {
    isScrolledUpRef.current = false;
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
    setShowScrollBottomBtn(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isSending) return;
    if (!isAuthenticated) {
      setErrorMsg('សូមចូលប្រើប្រាស់គណនីមុនពេលផ្ញើសារ! (Please login to send messages)');
      return;
    }

    setIsSending(true);
    try {
      const targetRecipient = getTargetRecipient();
      const replyText = replyingTo ? (replyingTo.message || (replyingTo.media_url ? '[ឯកសារភ្ជាប់]' : 'សារ')) : undefined;
      await api.sendChatMessage(
        inputMessage.trim(),
        activeTab,
        targetRecipient,
        undefined,
        undefined,
        replyingTo?.id,
        replyingTo?.sender_name,
        replyText
      );
      setInputMessage('');
      setReplyingTo(null);
      isScrolledUpRef.current = false;
      await fetchMessages(true);
      scrollToBottom();
    } catch (err: any) {
      setErrorMsg(err.message || 'បរាជ័យក្នុងការផ្ញើសារ');
    } finally {
      setIsSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSending(true);
    try {
      const uploadRes = await api.uploadChatFile(file);
      const targetRecipient = getTargetRecipient();
      await api.sendChatMessage('', activeTab, targetRecipient, uploadRes.url, uploadRes.mediaType);
      await fetchMessages();
      scrollToBottom();
    } catch (err: any) {
      setErrorMsg(err.message || 'បរាជ័យក្នុងការ Upload ឯកសារ');
    } finally {
      setIsSending(false);
      e.target.value = '';
    }
  };

  const startRecording = async () => {
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
      setErrorMsg('មិនអាចបើកមីក្រូហ្វូនបានទេ! (Microphone permission denied or not supported)');
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
    setIsSending(true);
    try {
      const uploadRes = await api.uploadChatFile(blob, filename);
      const targetRecipient = activeTab === 'PRIVATE' ? recipientId : (activeTab === 'SUPPORT' ? 'admin' : undefined);
      await api.sendChatMessage('', activeTab, targetRecipient, uploadRes.url, 'audio');
      await fetchMessages();
      scrollToBottom();
    } catch (err: any) {
      setErrorMsg(err.message || 'បរាជ័យក្នុងការផ្ញើសារសំឡេង');
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = (msgId: string) => {
    askConfirmation(
      'លុបសារនេះ? (Delete Message)',
      'តើអ្នកពិតជាចង់លុបសារនេះមែនទេ?',
      async () => {
        try {
          await api.deleteChatMessage(msgId);
          await fetchMessages();
        } catch (err: any) {
          setErrorMsg(err.message || 'បរាជ័យក្នុងការលុបសារ');
        }
      },
      'លុបសារ (Delete)',
      'danger'
    );
  };

  const startPrivateChatWithUser = (userId: string) => {
    setRecipientId(userId);
    setActiveTab('PRIVATE');
  };

  const activeRecipient = chatUsers.find((u) => u.id === recipientId) || {
    id: 'admin-1',
    name: 'Master Admin',
    email: 'admin@stream.com',
    role: 'ADMIN',
    status: 'active'
  };

  const filteredChatUsers = chatUsers.filter((u) => {
    if (!userSearchQuery.trim()) return true;
    const q = userSearchQuery.toLowerCase();
    return (
      (u.id && u.id.toLowerCase().includes(q)) ||
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-khmer">
      <UserNavbar />

      {/* Hidden File Inputs */}
      <input type="file" ref={photoInputRef} accept="image/*" onChange={handleFileUpload} className="hidden" />
      <input type="file" ref={videoInputRef} accept="video/*" onChange={handleFileUpload} className="hidden" />
      <input type="file" ref={fileInputRef} accept="*/*" onChange={handleFileUpload} className="hidden" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 pt-24 pb-12 flex flex-col">
        {currentUser?.status === 'banned' && (
          <div className="mb-6 bg-amber-400 text-amber-950 p-4 rounded-3xl border-2 border-amber-500 flex items-center justify-between shadow-xl animate-in fade-in">
            <div className="flex items-center space-x-3">
              <Ban className="w-7 h-7 flex-shrink-0 text-amber-950" />
              <div>
                <p className="text-sm sm:text-base font-black">គណនីរបស់អ្នកត្រូវបានផ្អាក! (Account Suspended)</p>
                <p className="text-xs sm:text-sm font-semibold opacity-95">សូមផ្ញើសារនៅទីនេះទៅកាន់ Admin Support ដើម្បីស្នើសុំពិនិត្យ និងបើកគណនីឡើងវិញ។</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-950 text-amber-300 border border-amber-800 flex-shrink-0 hidden sm:inline-block">
              ផ្អាកគណនី
            </span>
          </div>
        )}

        {/* Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-brand-red animate-pulse" />
              ប្រព័ន្ធឆាតពិភាក្សាផ្ទាល់ (Live User Chat)
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              ពិភាក្សាជាមួយសមាជិក ផ្ញើសារសំឡេង (Voice Note) រូបភាព វីដេអូ ឯកសារ ឬឆាតទៅ Support
            </p>
          </div>

          {/* Room Switcher Tabs */}
          <div className="flex items-center bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 shadow-inner flex-wrap gap-1">
            <button
              onClick={() => setActiveTab('GROUP')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
                activeTab === 'GROUP'
                  ? 'bg-brand-red text-white shadow-lg shadow-brand-red/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-4 h-4" />
              បន្ទប់និយាយរួម (Global Group Chat)
            </button>
            <button
              onClick={() => setActiveTab('PRIVATE')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
                activeTab === 'PRIVATE'
                  ? 'bg-brand-red text-white shadow-lg shadow-brand-red/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <User className="w-4 h-4" />
              ឆាតផ្ទាល់ខ្លួន (Private Chat)
            </button>
            <button
              onClick={() => setActiveTab('SUPPORT')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
                activeTab === 'SUPPORT'
                  ? 'bg-brand-red text-white shadow-lg shadow-brand-red/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Headphones className="w-4 h-4" />
              ជំនួយ Admin (Support Chat)
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 bg-red-950/80 border border-red-500/50 text-red-200 px-4 py-3 rounded-2xl flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Main Grid Layout */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* USER SELECTION SIDEBAR FOR PRIVATE CHAT & ADMIN SUPPORT */}
          {(activeTab === 'PRIVATE' || (activeTab === 'SUPPORT' && currentUser?.role === 'ADMIN')) && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 space-y-3 shadow-xl">
              <div className="flex items-center justify-between px-1 pb-2 border-b border-slate-800">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-brand-red" />
                  <span>{activeTab === 'SUPPORT' ? 'អតិថិជនឆាត Support' : 'សមាជិក'} ({filteredChatUsers.length})</span>
                </h3>
              </div>

              {/* Live Search Bar for ID / Name / Email */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="ស្វែងរកតាម ID, ឈ្មោះ, ឬអ៊ីមែល..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 text-slate-100 text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-brand-red font-medium placeholder-slate-500"
                />
              </div>

              <div className="space-y-1.5 max-h-[440px] overflow-y-auto pr-1">
                {filteredChatUsers.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-500">
                    រកមិនឃើញសមាជិកដែលមាន ID ឬឈ្មោះនេះទេ
                  </div>
                ) : (
                  filteredChatUsers.map((u) => {
                    const isSelected = recipientId === u.id;
                    return (
                      <button
                        key={u.id}
                        onClick={() => setRecipientId(u.id)}
                        className={`w-full text-left p-3 rounded-2xl border flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-brand-red/20 border-brand-red text-white shadow-md shadow-brand-red/10'
                            : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/60 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-white uppercase flex-shrink-0">
                            {u.name?.substring(0, 2).toUpperCase() || 'US'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs truncate">{u.name}</span>
                              <span className="bg-slate-800 text-slate-400 text-[9px] font-mono px-1 rounded">
                                ID:{u.id}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 truncate block">{u.email}</span>
                          </div>
                        </div>
                        {u.role === 'ADMIN' && (
                          <span className="bg-amber-500/20 text-amber-300 text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-amber-500/30 flex-shrink-0">
                            Admin
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* MAIN CHAT MESSAGES PANEL */}
          <div className={`${(activeTab === 'PRIVATE' || (activeTab === 'SUPPORT' && currentUser?.role === 'ADMIN')) ? 'lg:col-span-3' : 'lg:col-span-4'} bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden flex flex-col shadow-2xl backdrop-blur-xl min-h-[520px]`}>
            {/* Active Chat Header */}
            <div className="px-6 py-4 bg-slate-900 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                <span className="font-extrabold text-sm text-slate-200">
                  {activeTab === 'GROUP'
                    ? 'បន្ទប់និយាយរួម (Public Chatroom)'
                    : activeTab === 'SUPPORT'
                    ? 'ឆាតផ្ទាល់ជាមួយក្រុមការងារ Support (Admin Direct Support)'
                    : `ឆាតផ្ទាល់ខ្លួនជាមួយ: ${activeRecipient.name || activeRecipient.email} ${activeRecipient.role === 'ADMIN' ? '(Admin)' : ''}`}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                {activeTab !== 'SUPPORT' && (
                  <button
                    onClick={startVoiceCall}
                    disabled={callState !== 'idle'}
                    className="p-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-xl transition flex items-center gap-1.5 text-xs font-bold border border-emerald-500/30"
                    title="ខលសំឡេង (Voice Call)"
                  >
                    <Phone className="w-4 h-4" />
                    <span className="hidden sm:inline">ខលសំឡេង (Call)</span>
                  </button>
                )}
                <button
                  onClick={() => fetchMessages(true)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
                  title="Refresh messages"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Container */}
            <div className="relative flex-1 overflow-hidden">
              <div
                ref={chatContainerRef}
                onScroll={handleScroll}
                className="p-6 overflow-y-auto space-y-4 max-h-[500px] h-full"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
                    កំពុងទាញយកសារ...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-sm">
                    <MessageSquare className="w-12 h-12 mb-2 opacity-30" />
                    មិនទាន់មានសារក្នុងប្រអប់នេះនៅឡើយទេ។ ចាប់ផ្ដើមនិយាយគ្នា ឬផ្ញើសំឡេង/រូបភាពឥឡូវនេះ!
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = currentUser && (msg.sender_id === currentUser.id || msg.sender_name === currentUser.email?.split('@')[0]);
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {activeTab !== 'SUPPORT' && (
                            msg.sender_avatar ? (
                              <img
                                src={msg.sender_avatar}
                                alt={msg.sender_name}
                                className="w-6 h-6 rounded-full object-cover border border-slate-700 shrink-0"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-extrabold text-[9px] text-white uppercase shrink-0">
                                {msg.sender_name?.substring(0, 2).toUpperCase() || 'US'}
                              </div>
                            )
                          )}
                          <button
                            onClick={() => !isMe && startPrivateChatWithUser(msg.sender_id)}
                            className="text-xs font-bold text-slate-400 hover:text-brand-red flex items-center gap-1.5 transition"
                            title={!isMe ? "ចុចដើម្បីឆាតផ្ទាល់ខ្លួន" : undefined}
                          >
                            <span>{msg.sender_name}</span>
                            <span className="text-[9px] font-mono text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                              ID: {msg.sender_id}
                            </span>
                            {msg.sender_id?.includes('admin') && (
                              <span className="bg-amber-500/20 text-amber-300 text-[10px] px-1.5 py-0.5 rounded border border-amber-500/30 flex items-center gap-0.5">
                                <Shield className="w-2.5 h-2.5" /> Admin
                              </span>
                            )}
                          </button>
                          <span className="text-[10px] text-slate-500">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 max-w-[85%]">
                          <button
                            onClick={() => setReplyingTo(msg)}
                            className="opacity-0 group-hover:opacity-100 transition text-slate-400 hover:text-amber-400 p-1"
                            title="ឆ្លើយតបសារនេះ (Reply)"
                          >
                            <Reply className="w-3.5 h-3.5" />
                          </button>
                          {(currentUser?.role === 'ADMIN' || isMe) && (
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="opacity-0 group-hover:opacity-100 transition text-red-400 hover:text-red-300 p-1"
                              title="លុបសារនេះ (Delete message)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {msg.media_type === 'missed_call' || msg.media_type === 'call_ended' || msg.message === '[MISSED_CALL]' || msg.message?.includes('Missed audio call') || msg.message?.includes('Audio call ended') ? (
                            <div className="bg-[#282634] border border-slate-700/60 rounded-3xl p-4 sm:p-5 w-64 sm:w-72 text-white shadow-2xl space-y-3.5 my-1">
                              <div className="flex items-center space-x-3.5">
                                <div className={`w-12 h-12 rounded-full border flex items-center justify-center shrink-0 shadow-md ${
                                  msg.media_type === 'call_ended' || msg.message?.includes('Audio call ended')
                                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                                    : 'bg-slate-700/70 border-slate-600/50 text-slate-200'
                                }`}>
                                  {msg.media_type === 'call_ended' || msg.message?.includes('Audio call ended') ? (
                                    <Phone className="w-6 h-6 text-emerald-400" />
                                  ) : (
                                    <PhoneOff className="w-6 h-6 text-slate-200" />
                                  )}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="font-bold text-sm sm:text-base text-white tracking-tight leading-snug">
                                    {msg.media_type === 'call_ended' || msg.message?.includes('Audio call ended')
                                      ? (msg.message || 'Audio call ended')
                                      : 'Missed audio call'}
                                  </span>
                                  <span className="text-xs text-indigo-300 font-medium">
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  if (!isMe && msg.sender_id) {
                                    setRecipientId(msg.sender_id);
                                  }
                                  startVoiceCall();
                                }}
                                className="w-full bg-slate-700/60 hover:bg-slate-600/80 text-white font-bold py-3 rounded-2xl text-sm transition-all shadow-md flex items-center justify-center gap-2 border border-slate-600/40 hover:scale-[1.02] active:scale-95 cursor-pointer"
                              >
                                <span>Call again</span>
                              </button>
                            </div>
                          ) : (
                            <div
                              className={`rounded-2xl text-sm leading-relaxed ${
                                msg.media_url && !msg.message
                                  ? ''
                                  : isMe
                                  ? 'p-3.5 bg-brand-red text-white rounded-br-none shadow-lg shadow-brand-red/20'
                                  : 'p-3.5 bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700/60'
                              }`}
                            >
                              {/* Quoted Reply Preview */}
                              {msg.reply_to_text && (
                                <div className={`text-xs p-2.5 rounded-xl mb-2 border-l-4 text-left ${
                                  isMe
                                    ? 'bg-red-900/80 border-amber-300 text-slate-100'
                                    : 'bg-slate-900/90 border-brand-red text-slate-200'
                                }`}>
                                  <div className="font-bold text-[10px] text-amber-300 flex items-center gap-1 mb-0.5">
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
                                      ? isMe
                                        ? 'p-3.5 bg-brand-red text-white rounded-2xl shadow-md mb-2'
                                        : 'p-3.5 bg-slate-800 text-slate-100 rounded-2xl border border-slate-700/60 mb-2'
                                      : ''
                                  }
                                >
                                  {msg.message}
                                </div>
                              )}

                              {/* Media Attachment Rendering */}
                              {msg.media_url && (
                                <div>
                                  {msg.media_type === 'image' && (
                                    <a href={msg.media_url} target="_blank" rel="noopener noreferrer">
                                      <img
                                        src={msg.media_url}
                                        alt="Photo attachment"
                                        className="max-w-xs max-h-60 rounded-2xl border border-slate-700/80 object-cover hover:opacity-90 transition cursor-pointer shadow-md"
                                      />
                                    </a>
                                  )}

                                  {msg.media_type === 'video' && (
                                    <video
                                      controls
                                      src={msg.media_url}
                                      className="max-w-xs max-h-60 rounded-2xl border border-slate-700/80 shadow-md"
                                    />
                                  )}

                                  {msg.media_type === 'audio' && (
                                    <div className="flex items-center gap-2 bg-white border border-slate-200 p-2 rounded-full shadow-lg text-slate-800">
                                      <audio controls src={msg.media_url} className="max-w-[260px] h-10" />
                                    </div>
                                  )}

                                  {msg.media_type === 'file' && (
                                    <a
                                      href={msg.media_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      download
                                      className="flex items-center gap-2.5 bg-slate-900 text-slate-100 p-3 rounded-2xl border border-slate-700 hover:bg-slate-800 transition text-xs font-semibold shadow-md"
                                    >
                                      <Paperclip className="w-4 h-4 text-brand-red flex-shrink-0" />
                                      <span className="truncate max-w-[160px]">ទាញយកឯកសារ (Download File)</span>
                                      <Download className="w-4 h-4 ml-auto text-slate-400" />
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Scroll to Bottom Floating Button */}
              {showScrollBottomBtn && (
                <button
                  onClick={scrollToBottom}
                  className="absolute bottom-4 right-6 bg-brand-red text-white px-3.5 py-2 rounded-full shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-1.5 text-xs font-bold border border-white/20 z-10"
                >
                  <ArrowDown className="w-4 h-4 animate-bounce" />
                  <span>សារថ្មី / ចុះទៅខាងក្រោម</span>
                </button>
              )}
            </div>

            {/* Input Bar & Attachment Toolbar */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-2">
              {/* Reply Preview Banner */}
              {replyingTo && (
                <div className="flex items-center justify-between bg-slate-950 border-l-4 border-brand-red px-4 py-2.5 rounded-2xl text-xs text-slate-200 shadow-inner">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-brand-red flex items-center gap-1.5 text-[11px]">
                      <Reply className="w-3.5 h-3.5" />
                      <span>កំពុងឆ្លើយតបទៅកាន់ {replyingTo.sender_name}</span>
                    </div>
                    <div className="truncate text-slate-400 text-[11px] mt-0.5">
                      {replyingTo.message || (replyingTo.media_url ? '[ឯកសារភ្ជាប់ / Media]' : 'សារ')}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
                    title="បោះបង់ (Cancel)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Login Prompt overlay when unauthenticated */}
              {!isAuthenticated ? (
                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-center space-y-2">
                  <p className="text-xs text-slate-400 font-medium">
                    សូមចូលប្រើប្រាស់គណនីរបស់អ្នក ដើម្បីផ្ញើសារ ថតសំឡេង និងរូបភាពក្នុងបន្ទប់ឆាត
                  </p>
                  <a
                    href="/login"
                    className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-brand-red to-pink-600 hover:opacity-90 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-brand-red/30 transition hover:scale-105"
                  >
                    <User className="w-4 h-4" />
                    <span>ចូលប្រើប្រាស់គណនី (Login to Chat)</span>
                  </a>
                </div>
              ) : isRecording ? (
                <div className="flex items-center justify-between bg-red-950/90 border border-red-500/60 p-3 rounded-2xl text-red-200 text-xs animate-pulse">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                    <span className="font-bold">កំពុងថតសំឡេង (Recording Voice Note)... {recordingSeconds}s</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={cancelRecording}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold flex items-center gap-1 transition"
                    >
                      <X className="w-3.5 h-3.5" /> បោះបង់
                    </button>
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="px-4 py-1.5 bg-brand-red hover:bg-red-700 text-white rounded-xl font-bold flex items-center gap-1 transition shadow-md"
                    >
                      <Square className="w-3.5 h-3.5" /> រួចរាល់ & ផ្ញើ
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  {/* Attachment Action Buttons */}
                  <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={isSending}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
                      title="ផ្ញើរូបភាព (Send Photo)"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => videoInputRef.current?.click()}
                      disabled={isSending}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
                      title="ផ្ញើវីដេអូ (Send Video)"
                    >
                      <Film className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSending}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
                      title="ផ្ញើឯកសារ (Send File)"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={startRecording}
                      disabled={isSending}
                      className="p-2 text-slate-400 hover:text-brand-red hover:bg-slate-800 rounded-xl transition"
                      title="ថតសំឡេង (Record Voice Note)"
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Text Input */}
                  <input
                    type="text"
                    placeholder={`សរសេរសារផ្ញើទៅកាន់ ${activeTab === 'GROUP' ? 'បន្ទប់និយាយរួម' : activeRecipient.name}...`}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    disabled={isSending}
                    className="flex-1 bg-slate-950 text-slate-100 text-xs sm:text-sm placeholder-slate-500 px-4 sm:px-5 py-3 rounded-2xl border border-slate-800 focus:outline-none focus:border-brand-red transition min-w-0"
                  />

                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || isSending}
                    className="bg-brand-red hover:bg-red-700 text-white font-bold px-4 sm:px-6 py-3 rounded-2xl flex items-center gap-1.5 transition disabled:opacity-50 shadow-lg shadow-brand-red/30 shrink-0 text-xs sm:text-sm"
                  >
                    <Send className="w-4 h-4" />
                    <span>ផ្ញើ</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Hidden WebRTC Remote Audio Element */}
      <audio ref={remoteAudioRef} autoPlay />

      {/* INCOMING VOICE CALL MODAL */}
      {callState === 'incoming' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-sm w-full text-center space-y-6 shadow-2xl text-white">
            <div className="relative inline-block">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto animate-pulse">
                <PhoneCall className="w-10 h-10 text-emerald-400 animate-bounce" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-black text-white">{callPeerInfo.name || 'User'}</h3>
              <p className="text-xs text-slate-400 mt-1 font-medium">កំពុងទូរស័ព្ទមកកាន់អ្នក... (Incoming Voice Call)</p>
            </div>
            <div className="flex items-center justify-center space-x-6 pt-2">
              <button
                onClick={declineVoiceCall}
                className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-xl transition-all hover:scale-110"
                title="បដិសេធ (Decline)"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
              <button
                onClick={acceptVoiceCall}
                className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-xl transition-all hover:scale-110 animate-bounce"
                title="ទទួលទូរស័ព្ទ (Accept)"
              >
                <PhoneCall className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE / CALLING VOICE & VIDEO CALL OVERLAY */}
      {(callState === 'calling' || callState === 'connected') && (
        isCallMinimized ? (
          /* Minimized Floating Widget at Bottom-Right */
          <div className="fixed bottom-6 right-6 z-[999999] bg-slate-900/95 border border-slate-700/80 rounded-3xl p-4 shadow-2xl backdrop-blur-xl text-white flex items-center space-x-4 animate-slide-up">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-slate-200 uppercase">
                {callPeerInfo.name?.substring(0, 2).toUpperCase() || 'US'}
              </div>
              <div>
                <h4 className="text-xs font-black text-white truncate max-w-[120px]">{callPeerInfo.name || 'User'}</h4>
                <p className="text-[10px] text-emerald-400 font-mono font-bold">
                  {callState === 'calling' ? 'Calling...' : `${Math.floor(callSeconds / 60).toString().padStart(2, '0')}:${(callSeconds % 60).toString().padStart(2, '0')}`}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsCallMinimized(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                title="ពង្រីក (Maximize)"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                onClick={toggleCallMic}
                className={`p-2 rounded-xl border transition ${
                  isMicMuted ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <button
                onClick={() => endVoiceCall(true)}
                className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md transition"
                title="បញ្ចប់ (End)"
              >
                <PhoneOff className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Full Screen Call UI matching user screenshot */
          <div className="fixed inset-0 z-[999999] bg-gradient-to-b from-slate-900/95 via-slate-900/95 to-slate-950/98 backdrop-blur-2xl flex flex-col justify-between p-6 sm:p-10 text-white animate-fade-in">
            {/* Hidden Video Elements for WebRTC Streams */}
            <video ref={remoteVideoRef} autoPlay playsInline className="hidden" />
            <video ref={localVideoRef} autoPlay muted playsInline className="hidden" />

            {/* TOP BAR: ONLY Minimize Icon */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setIsCallMinimized(true)}
                className="p-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/60 shadow-lg transition-all cursor-pointer group"
                title="ពង្រួមចេញក្រៅ (Minimize Call)"
              >
                <Minimize2 className="w-5 h-5 text-slate-300 group-hover:scale-110 transition-transform" />
              </button>
            </div>

            {/* CENTER AREA: Large Profile Avatar & Calling Status */}
            <div className="flex flex-col items-center justify-center my-auto space-y-4 text-center">
              <div className="relative">
                <div className="w-32 h-32 sm:w-44 sm:h-44 rounded-full bg-slate-800/90 border-4 border-slate-700/80 shadow-2xl flex items-center justify-center text-slate-300 overflow-hidden ring-8 ring-slate-800/40 relative">
                  {isCameraOn ? (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                  ) : (
                    <User className="w-16 h-16 sm:w-20 sm:h-20 text-slate-400" />
                  )}
                </div>
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {callPeerInfo.name || 'User'}
                </h2>
                <p className="text-sm font-semibold text-slate-400 mt-1 font-mono">
                  {callState === 'calling'
                    ? 'Calling...'
                    : `${Math.floor(callSeconds / 60).toString().padStart(2, '0')}:${(callSeconds % 60).toString().padStart(2, '0')}`}
                </p>
              </div>
            </div>

            {/* BOTTOM CONTROL BAR: 4 Action Buttons (Middle Button Removed as requested) */}
            <div className="flex items-center justify-center space-x-4 sm:space-x-6 pb-6">
              {/* 1. Camera Toggle Button */}
              <button
                onClick={toggleCallCamera}
                className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all ${
                  !isCameraOn
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                    : 'bg-slate-800/90 hover:bg-slate-700 text-white'
                }`}
                title={isCameraOn ? 'បិទកាមេរ៉ា' : 'បើកកាមេរ៉ា'}
              >
                {!isCameraOn ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
              </button>

              {/* 2. Microphone Toggle Button */}
              <button
                onClick={toggleCallMic}
                className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all ${
                  isMicMuted
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                    : 'bg-slate-800/90 hover:bg-slate-700 text-white'
                }`}
                title={isMicMuted ? 'បើកមីក្រូហ្វូន' : 'បិទមីក្រូហ្វូន'}
              >
                {isMicMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>

              {/* 3. Speaker Toggle Button (White button matching reference image when active) */}
              <button
                onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all ${
                  isSpeakerOn
                    ? 'bg-white text-slate-950 shadow-lg shadow-white/20'
                    : 'bg-slate-800/90 hover:bg-slate-700 text-white'
                }`}
                title={isSpeakerOn ? 'បិទបាសសំឡេង (Speaker On)' : 'បើកបាសសំឡេង (Speaker Off)'}
              >
                {isSpeakerOn ? <Volume2 className="w-6 h-6 text-slate-950" /> : <VolumeX className="w-6 h-6" />}
              </button>

              {/* 4. End Call Button (Red Hang-Up Button) */}
              <button
                onClick={() => endVoiceCall(true)}
                className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg shadow-red-600/40 transition-all transform hover:scale-105"
                title="បញ្ចប់ការខល (End Call)"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </div>
          </div>
        )
      )}

      {/* CUSTOM CONFIRMATION / ALERT MODAL PORTAL */}
      {confirmModal.isOpen && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-sm sm:max-w-md w-full text-center space-y-5 shadow-2xl text-white transform transition-all animate-scale-in">
            <div className="relative inline-block">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto border ${
                confirmModal.type === 'danger'
                  ? 'bg-red-500/10 border-red-500/30 text-red-500'
                  : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
              }`}>
                {confirmModal.type === 'danger' ? (
                  <Trash2 className="w-8 h-8 text-red-500" />
                ) : (
                  <AlertCircle className="w-8 h-8 text-indigo-400" />
                )}
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
                {confirmModal.cancelText || 'បោះបង់ (Cancel)'}
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className={`flex-1 py-3 px-4 rounded-2xl text-white font-bold text-xs sm:text-sm transition shadow-lg cursor-pointer ${
                  confirmModal.type === 'danger'
                    ? 'bg-red-600 hover:bg-red-700 shadow-red-600/30'
                    : 'bg-brand-red hover:bg-red-700 shadow-brand-red/30'
                }`}
              >
                {confirmModal.confirmText || 'យល់ព្រម (Confirm)'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <UserFooter />
    </div>
  );
}
