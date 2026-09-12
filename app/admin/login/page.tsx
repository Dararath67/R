'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { ShieldAlert, Mail, ArrowLeft, KeyRound, Eye, EyeOff, Loader2, ShieldCheck, RefreshCw, LockKeyhole } from 'lucide-react';
import { TerkTlaLogo } from '@/components/user/TerkTlaLogo';

export default function AdminLoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [captchaNum1, setCaptchaNum1] = useState(0);
  const [captchaNum2, setCaptchaNum2] = useState(0);
  const [captchaInput, setCaptchaInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const generateCaptcha = () => {
    setCaptchaNum1(Math.floor(Math.random() * 9) + 1);
    setCaptchaNum2(Math.floor(Math.random() * 9) + 1);
    setCaptchaInput('');
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('សូមបញ្ចូលអ៊ីមែល និងលេខសម្ងាត់ Admin ឱ្យបានត្រឹមត្រូវ');
      return;
    }

    if (!captchaInput.trim() || parseInt(captchaInput) !== captchaNum1 + captchaNum2) {
      setError(`សូមបញ្ចូលលេខចម្លើយ ${captchaNum1} + ${captchaNum2} = ${captchaNum1 + captchaNum2} ចូលក្នុងប្រអប់ «លទ្ធផល» (Please enter security captcha answer ${captchaNum1 + captchaNum2})`);
      generateCaptcha();
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user = await login(email.trim(), password, 'ADMIN');
      if (user) {
        router.push('/admin');
      } else {
        setError('អ៊ីមែល ឬលេខសម្ងាត់មិនត្រឹមត្រូវ ឬគណនីត្រូវបានចាក់សោរបណ្តោះអាសន្ន!');
        generateCaptcha();
      }
    } catch (err: any) {
      setError(err.message || 'ការចូលប្រើប្រាស់ Admin បរាជ័យ');
      generateCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-8 space-y-6 relative overflow-hidden text-white">
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-brand-red via-amber-500 to-red-600" />

        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center mb-2">
            <TerkTlaLogo variant="dark" size="lg" />
          </div>
          <h1 className="text-xl font-black text-white tracking-wide uppercase">ចូលប្រើប្រាស់ Admin Panel</h1>
          <p className="text-xs text-slate-400 font-medium">សម្រាប់តែអ្នកគ្រប់គ្រងប្រព័ន្ធ (System Administrators Only)</p>
        </div>

        {error && (
          <div className="bg-red-950/80 border border-red-500/40 text-red-300 p-3.5 rounded-2xl text-xs flex items-center space-x-2 font-bold animate-shake">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              អ៊ីមែល Admin (Admin Email)
            </label>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="admin@stream.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-brand-red transition-colors"
              />
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              លេខសម្ងាត់ Admin (Admin Password)
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl py-3 pl-10 pr-10 text-sm focus:outline-none focus:border-brand-red transition-colors"
              />
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Admin 2FA Security PIN Challenge */}
          <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-400 text-[11px] flex items-center gap-1.5 uppercase tracking-wider">
                <LockKeyhole className="w-4 h-4 text-amber-400" />
                2FA Admin Verification PIN
              </span>
              <button
                type="button"
                onClick={generateCaptcha}
                className="text-slate-500 hover:text-brand-red p-1 rounded-md transition-colors"
                title="ប្តូរសំណួរ"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-slate-800 text-amber-300 font-extrabold px-3 py-2 rounded-xl text-sm tracking-widest select-none">
                {captchaNum1} + {captchaNum2} = ?
              </div>
              <input
                type="number"
                required
                placeholder="PIN"
                value={captchaInput}
                onChange={(e) => setCaptchaInput(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 text-white rounded-xl py-2 px-3 text-sm font-bold focus:outline-none focus:border-brand-red"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-brand-red hover:bg-red-700 text-white font-extrabold rounded-2xl shadow-lg shadow-brand-red/30 transition-all text-sm uppercase tracking-wider flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>កំពុងផ្ទៀងផ្ទាត់សិទ្ធិ...</span>
              </>
            ) : (
              <span>ចូលទៅកាន់ផ្ទាំងគ្រប់គ្រង (Admin Login)</span>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-800 text-center">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 text-xs text-slate-400 hover:text-white transition-colors font-bold"
          >
            <ArrowLeft className="w-4 h-4 text-brand-red" />
            <span>ត្រឡប់ទៅកាន់គេហទំព័រដើម</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
