'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserLayout } from '@/components/user/UserLayout';
import { useAuth } from '@/context/AuthContext';
import { Lock, Mail, ShieldAlert, Eye, EyeOff, Loader2, ShieldCheck, RefreshCw } from 'lucide-react';
import { TerkTlaLogo } from '@/components/user/TerkTlaLogo';

export default function LoginPage() {
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
      setError('សូមបញ្ចូលអ៊ីមែល និងលេខសម្ងាត់ឱ្យបានត្រឹមត្រូវ');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('ទម្រង់អ៊ីមែលមិនត្រឹមត្រូវទេ (Invalid email address format)');
      return;
    }

    if (password.length < 4) {
      setError('លេខសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ ៤ តួ (Password must be at least 4 characters)');
      return;
    }

    if (!captchaInput.trim() || parseInt(captchaInput) !== captchaNum1 + captchaNum2) {
      setError(`សូមបញ្ចូលលេខចម្លើយ ${captchaNum1} + ${captchaNum2} = ${captchaNum1 + captchaNum2} ចូលក្នុងប្រអប់ «លទ្ធផល» (Please enter security captcha answer ${captchaNum1 + captchaNum2})`);
      generateCaptcha();
      return;
    }

    setLoading(true);
    setError('');

    const user = await login(email.trim(), password);
    if (user) {
      if (user.role === 'ADMIN' || email.toLowerCase().includes('admin')) {
        router.push('/admin');
      } else {
        router.push('/');
      }
    } else {
      setError('អ៊ីមែល ឬលេខសម្ងាត់មិនត្រឹមត្រូវទេ ឬគណនីត្រូវបានចាក់សោ! (Invalid credentials or account locked)');
      generateCaptcha();
    }
    setLoading(false);
  };

  return (
    <UserLayout>
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center mb-2">
              <TerkTlaLogo variant="light" size="lg" />
            </div>
            <h1 className="text-xl font-black text-slate-900">ចូលប្រើប្រាស់ TERK TLA</h1>
            <p className="text-xs text-slate-500 font-medium">ចូលមើលប្រវត្តិទស្សនា ភាពយន្តចូលចិត្ត និងវីដេអូ 4K</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-3.5 rounded-2xl text-xs flex items-center space-x-2 font-bold animate-shake">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                អាសយដ្ឋានអ៊ីមែល (Email Address)
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-brand-red focus:bg-white transition-colors"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                លេខសម្ងាត់ (Password)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl py-3 pl-10 pr-10 text-sm focus:outline-none focus:border-brand-red focus:bg-white transition-colors"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Security Verification CAPTCHA */}
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 text-[11px] flex items-center gap-1.5 uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  ផ្ទៀងផ្ទាត់សុវត្ថិភាព (Human Verification)
                </span>
                <button
                  type="button"
                  onClick={generateCaptcha}
                  className="text-slate-400 hover:text-brand-red p-1 rounded-md transition-colors"
                  title="ប្តូរសំណួរ"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center space-x-3">
                <div className="bg-slate-200 text-slate-800 font-extrabold px-3 py-2 rounded-xl text-sm tracking-widest select-none">
                  {captchaNum1} + {captchaNum2} = ?
                </div>
                <input
                  type="number"
                  required
                  placeholder={`បញ្ចូលលេខ ${captchaNum1 + captchaNum2}`}
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  className="flex-1 bg-white border-2 border-brand-red/60 text-slate-900 rounded-xl py-2 px-3 text-sm font-bold focus:outline-none focus:border-brand-red shadow-sm"
                />
              </div>
              <p className="text-[11px] text-red-600 font-bold mt-1.5 flex items-center gap-1">
                <span>👉</span> វាយបញ្ចូលលេខ <span className="bg-red-100 text-brand-red px-1.5 py-0.5 rounded font-extrabold">{captchaNum1 + captchaNum2}</span> ចូលក្នុងប្រអប់ខាងលើ មុននឹងចុច Sign In
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-brand-red hover:bg-red-700 text-white font-extrabold rounded-2xl shadow-lg shadow-brand-red/30 transition-all text-sm flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>កំពុងផ្ទៀងផ្ទាត់...</span>
                </>
              ) : (
                <span>ចូលប្រើប្រាស់ (Secure Sign In)</span>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
            <span>មិនទាន់មានគណនី? </span>
            <Link href="/register" className="font-extrabold text-brand-red hover:underline">
              ចុះឈ្មោះនៅទីនេះ (Sign Up)
            </Link>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}
