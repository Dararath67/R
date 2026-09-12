'use client';

import React from 'react';
import { Smartphone, Download, ShieldCheck, Zap, CheckCircle2, Film } from 'lucide-react';
import { useData } from '@/context/DataContext';

export const AppDownloadSection: React.FC = () => {
  const { bannerSettings } = useData();

  if (bannerSettings.showAppSection === false) {
    return null;
  }

  const title = bannerSettings.appSectionTitle || 'ទាញយកកម្មវិធី CineStream Mobile App';
  const subtitle =
    bannerSettings.appSectionSubtitle ||
    'ទស្សនាភាពយន្ត និងរឿងភាគល្បីៗលើទូរស័ព្ទដៃ Android & iOS គ្រប់ពេលវេលា គុណភាព 4K Ultra HD';
  const androidUrl = bannerSettings.androidAppUrl || 'https://play.google.com';
  const iosUrl = bannerSettings.iosAppUrl || 'https://apple.com/app-store';
  const apkUrl = bannerSettings.apkDownloadUrl || 'https://cinestream.app/download.apk';

  return (
    <section className="relative my-16 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 rounded-[2.5rem] p-8 sm:p-12 overflow-hidden border border-slate-800 shadow-2xl text-white">
      {/* Background Ambient Lights */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-brand-red/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Side: Content Details & Buttons */}
        <div className="lg:col-span-7 space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 bg-brand-red/20 border border-brand-red/40 px-4 py-1.5 rounded-full text-brand-red text-xs font-black uppercase tracking-wider shadow-sm">
            <Smartphone className="w-4 h-4" />
            <span>MOBILE STREAMING APP</span>
          </div>

          {/* Title & Description */}
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
            {title}
          </h2>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
            {subtitle}
          </p>

          {/* Features List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="flex items-center space-x-2.5 bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
              <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span className="text-xs font-bold text-slate-200">ទស្សនាបានគ្រប់ទីកន្លែង (Offline Play)</span>
            </div>
            <div className="flex items-center space-x-2.5 bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
              <Zap className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <span className="text-xs font-bold text-slate-200">រូបភាព 4K Ultra HD &amp; លឿនរហ័ស</span>
            </div>
            <div className="flex items-center space-x-2.5 bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
              <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <span className="text-xs font-bold text-slate-200">គ្មានពាណិជ្ជកម្មរំខាន (No Ads)</span>
            </div>
            <div className="flex items-center space-x-2.5 bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
              <Film className="w-5 h-5 text-brand-red flex-shrink-0" />
              <span className="text-xs font-bold text-slate-200">អត្ថបទរត់ជាភាសាខ្មែរ 100%</span>
            </div>
          </div>

          {/* Download Buttons */}
          <div className="pt-4 flex flex-wrap items-center gap-4">
            <a
              href={androidUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-3 px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl border border-slate-700 shadow-md transition-all hover:scale-105"
            >
              <div className="w-6 h-6 flex items-center justify-center font-bold text-emerald-400 text-lg">
                ▶
              </div>
              <div className="text-left">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">GET IT ON</p>
                <p className="text-xs font-black">Google Play</p>
              </div>
            </a>

            <a
              href={iosUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-3 px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl border border-slate-700 shadow-md transition-all hover:scale-105"
            >
              <div className="w-6 h-6 flex items-center justify-center font-bold text-white text-lg">
                
              </div>
              <div className="text-left">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">DOWNLOAD ON</p>
                <p className="text-xs font-black">App Store</p>
              </div>
            </a>

            <a
              href={apkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2.5 px-6 py-3.5 bg-brand-red hover:bg-brand-crimson text-white rounded-2xl font-black text-xs shadow-lg shadow-brand-red/40 transition-all hover:scale-105"
            >
              <Download className="w-4 h-4" />
              <span>ទាញយក Android APK</span>
            </a>
          </div>
        </div>

        {/* Right Side: Visual App Screen Mockup Preview */}
        <div className="lg:col-span-5 flex items-center justify-center">
          <div className="relative w-64 h-[440px] bg-slate-900 rounded-[3rem] p-3 border-4 border-slate-700 shadow-2xl overflow-hidden transform rotate-2 hover:rotate-0 transition-transform duration-500">
            {/* Camera notch */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-800 rounded-full z-20" />
            
            {/* Screen Content Preview */}
            <div className="w-full h-full bg-slate-950 rounded-[2.2rem] overflow-hidden p-4 space-y-4 pt-10 border border-slate-800 text-left">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-brand-red">CINESTREAM</span>
                <span className="text-[10px] bg-brand-red/20 text-brand-red px-2 py-0.5 rounded-full font-bold">4K MOBILE</span>
              </div>

              {/* Mock Banner */}
              <div className="w-full h-36 bg-gradient-to-tr from-brand-red via-red-800 to-slate-900 rounded-2xl p-3 flex flex-col justify-end relative overflow-hidden">
                <span className="text-[10px] text-white/80 font-bold">FEATURED APP</span>
                <h4 className="text-xs font-black text-white">Movie Streaming HD</h4>
              </div>

              {/* Mock Movies Grid */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400">កំពុងពេញនិយម</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-20 bg-slate-800 rounded-xl" />
                  <div className="h-20 bg-slate-800 rounded-xl" />
                  <div className="h-20 bg-slate-800 rounded-xl" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
