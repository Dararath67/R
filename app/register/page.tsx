'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserLayout } from '@/components/user/UserLayout';
import { useAuth } from '@/context/AuthContext';
import { Lock, Mail, User as UserIcon, ShieldAlert, UserPlus, Eye, EyeOff, Loader2, CheckCircle2, ShieldCheck, RefreshCw } from 'lucide-react';
import { TerkTlaLogo } from '@/components/user/TerkTlaLogo';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [captchaNum1, setCaptchaNum1] = useState(0);
  const [captchaNum2, setCaptchaNum2] = useState(0);
  const [captchaInput, setCaptchaInput] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const generateCaptcha = () => {
    setCaptchaNum1(Math.floor(Math.random() * 9) + 1);
    setCaptchaNum2(Math.floor(Math.random() * 9) + 1);
    setCaptchaInput('');
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  // Compute password strength
  const getPasswordStrength = () => {
    if (!password) return { label: '', color: '', percent: 0 };
    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;

    if (score <= 1) return { label: 'ខ្សោយ (Weak)', color: 'bg-red-500', percent: 25 };
    if (score === 2) return { label: 'មធ្យម (Medium)', color: 'bg-amber-500', percent: 60 };
    return { label: 'រឹងមាំខ្លាំង (Strong)', color: 'bg-emerald-500', percent: 100 };
  };

  const strength = getPasswordStrength();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || !password) {
      setError('សូមបំពេញព័ត៌មានចាំបាច់ទាំងអស់ (Please fill in all required fields)');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('ទម្រង់អ៊ីមែលមិនត្រឹមត្រូវទេ (Invalid email address format)');
      return;
    }

    if (password.length < 6) {
      setError('លេខសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ ៦ តួ (Password must be at least 6 characters)');
      return;
    }

    if (password !== confirmPassword) {
      setError('លេខសម្ងាត់ផ្ទៀងផ្ទាត់មិនត្រូវគ្នាទេ (Passwords do not match)');
      return;
    }

    if (parseInt(captchaInput) !== captchaNum1 + captchaNum2) {
      setError('កូដផ្ទៀងផ្ទាត់សុវត្ថិភាពមិនត្រឹមត្រូវទេ! (Security PIN captcha invalid)');
      generateCaptcha();
      return;
    }

    setSubmitting(true);
    try {
      const success = await register(name.trim(), email.trim(), password);
      if (success) {
        if (email.toLowerCase().includes('admin')) {
          router.push('/admin');
        } else {
          router.push('/');
        }
      }
    } catch (err: any) {
      setError(err.message || 'ការចុះឈ្មោះបរាជ័យ');
      generateCaptcha();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <UserLayout>
      <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center mb-2">
              <TerkTlaLogo variant="light" size="lg" />
            </div>
            <h1 className="text-xl font-black text-slate-900">ចុះឈ្មោះគណនី TERK TLA</h1>
            <p className="text-xs text-slate-500 font-medium">បង្កើតគណនីដើម្បីទស្សនាភាពយន្ត 4K ដោយសុវត្ថិភាព</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-3.5 rounded-2xl text-xs flex items-center space-x-2 font-bold">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                ឈ្មោះពេញ (Full Name)
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="ឈ្មោះពេញរបស់អ្នក"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-brand-red focus:bg-white transition-colors"
                />
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                អាសយដ្ឋានអ៊ីមែល (Email)
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
                លេខសម្ងាត់ (Password - យ៉ាងហោច ៦ តួ)
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

              {/* Password Strength Indicator */}
              {password && (
                <div className="mt-2 space-y-1">
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${strength.color}`}
                      style={{ width: `${strength.percent}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400 font-medium">កម្រិតសុវត្ថិភាពលេខសម្ងាត់:</span>
                    <span className="font-extrabold text-slate-700">{strength.label}</span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                បញ្ជាក់លេខសម្ងាត់ (Confirm Password)
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl py-3 pl-10 pr-10 text-sm focus:outline-none focus:border-brand-red focus:bg-white transition-colors"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* CAPTCHA Security Verification */}
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
                  placeholder="លទ្ធផល"
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  className="flex-1 bg-white border border-slate-200 text-slate-900 rounded-xl py-2 px-3 text-sm font-bold focus:outline-none focus:border-brand-red"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-brand-red hover:bg-red-700 text-white font-extrabold rounded-2xl shadow-lg shadow-brand-red/30 transition-all text-sm flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>កំពុងបង្កើតគណនី...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>ចុះឈ្មោះ (Secure Register)</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
            <span>មានគណនីរួចហើយ? </span>
            <Link href="/login" className="font-extrabold text-brand-red hover:underline">
              ចូលប្រើប្រាស់នៅទីនេះ (Sign In)
            </Link>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}
