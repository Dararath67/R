'use client';

import React from 'react';
import Link from 'next/link';
import { Play, Github, Twitter, Facebook, Instagram, ShieldCheck, Send } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { TerkTlaLogo } from '@/components/user/TerkTlaLogo';

export const UserFooter: React.FC = () => {
  const { bannerSettings } = useData();

  return (
    <footer className="bg-white border-t border-slate-200 text-slate-600 pt-12 pb-24 md:pb-8 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <Link href="/" className="inline-flex items-center">
              <TerkTlaLogo variant="light" size="md" />
            </Link>
            <p className="text-sm text-slate-500 leading-relaxed">
              វេទិកា streaming ភាពយន្តឈានមុខគេ ដែលផ្តល់ជូននូវភាពយន្ត និងរឿងភាគគុណភាពខ្ពស់ 4K Ultra HD។
            </p>
            <div className="flex items-center space-x-2 pt-2">
              <a
                href={bannerSettings.facebookUrl || 'https://facebook.com'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-7 h-7 rounded-full bg-slate-100/80 hover:bg-brand-red flex items-center justify-center text-slate-600 hover:text-white transition-all shadow-sm"
                title="Facebook"
              >
                <Facebook className="w-3.5 h-3.5" />
              </a>
              <a
                href={bannerSettings.twitterUrl || 'https://twitter.com'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-7 h-7 rounded-full bg-slate-100/80 hover:bg-brand-red flex items-center justify-center text-slate-600 hover:text-white transition-all shadow-sm"
                title="Twitter / X"
              >
                <Twitter className="w-3.5 h-3.5" />
              </a>
              <a
                href={bannerSettings.instagramUrl || 'https://instagram.com'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-7 h-7 rounded-full bg-slate-100/80 hover:bg-brand-red flex items-center justify-center text-slate-600 hover:text-white transition-all shadow-sm"
                title="Instagram"
              >
                <Instagram className="w-3.5 h-3.5" />
              </a>
              <a
                href={bannerSettings.githubUrl || 'https://github.com'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-7 h-7 rounded-full bg-slate-100/80 hover:bg-brand-red flex items-center justify-center text-slate-600 hover:text-white transition-all shadow-sm"
                title="GitHub"
              >
                <Github className="w-3.5 h-3.5" />
              </a>
              <a
                href={bannerSettings.tiktokUrl || 'https://tiktok.com'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-7 h-7 rounded-full bg-slate-100/80 hover:bg-brand-red flex items-center justify-center text-slate-600 hover:text-white transition-all shadow-sm"
                title="TikTok"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 1 1-5.2-1.74 2.89 2.89 0 0 1 2.31-2.22V8.05a6.34 6.34 0 0 0-5.15 6.2 6.34 6.34 0 0 0 10.86 4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-3.37-3.11z"/>
                </svg>
              </a>
              <a
                href={bannerSettings.telegramUrl || 'https://t.me'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-7 h-7 rounded-full bg-slate-100/80 hover:bg-brand-red flex items-center justify-center text-slate-600 hover:text-white transition-all shadow-sm"
                title="Telegram"
              >
                <Send className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
              ស្វែងរកមាតិកា
            </h4>
            <ul className="space-y-2.5 text-sm font-medium">
              <li>
                <Link href="/movies" className="hover:text-brand-red transition-colors">
                  ភាពយន្តសកម្មភាព &amp; ពេញនិយម
                </Link>
              </li>
              <li>
                <Link href="/movies?genre=sci-fi" className="hover:text-brand-red transition-colors">
                  ភាពយន្តវិទ្យាសាស្ត្រ &amp; ផ្សងព្រេង
                </Link>
              </li>
              <li>
                <Link href="/movies?sort=rating" className="hover:text-brand-red transition-colors">
                  ភាពយន្តពិន្ទុខ្ពស់ៗ
                </Link>
              </li>
            </ul>
          </div>

          {/* Help & Support */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
              មុខងារ Streaming
            </h4>
            <ul className="space-y-2.5 text-sm font-medium">
              <li>
                <span className="hover:text-brand-red cursor-pointer transition-colors">
                  រូបភាពច្បាស់ Ultra HD &amp; 4K
                </span>
              </li>
              <li>
                <span className="hover:text-brand-red cursor-pointer transition-colors">
                  អត្ថបទរត់ច្រើនភាសា (Subtitles)
                </span>
              </li>
              <li>
                <span className="hover:text-brand-red cursor-pointer transition-colors">
                  កម្រិតវីដេអូ HTML5 រលូន
                </span>
              </li>
            </ul>
          </div>

          {/* Guarantee */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              ការធានាគុណភាព
            </h4>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center space-x-2 text-amber-600">
                <ShieldCheck className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-wider">4K Ultra HD</span>
              </div>
              <p className="text-xs text-slate-500">
                ការទស្សនាវីដេអូដោយរលូន ជាមួយជម្រើសសំឡេង និងអត្ថបទរត់ពីក្រោម។
              </p>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between text-xs text-slate-400 font-medium">
          <p>© {new Date().getFullYear()} {bannerSettings?.siteName || 'CINESTREAM'}. រក្សាសិទ្ធិគ្រប់យ៉ាង។</p>
          <div className="flex items-center space-x-6 mt-4 md:mt-0">
            <span className="hover:text-slate-600 cursor-pointer">គោលការណ៍ឯកជនភាព</span>
            <span className="hover:text-slate-600 cursor-pointer">លក្ខខណ្ឌប្រើប្រាស់</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
