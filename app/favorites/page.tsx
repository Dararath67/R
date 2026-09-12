'use client';

import React from 'react';
import Link from 'next/link';
import { UserLayout } from '@/components/user/UserLayout';
import { MovieGrid } from '@/components/user/MovieGrid';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { Heart } from 'lucide-react';

export default function FavoritesPage() {
  const { movies, series } = useData();
  const { currentUser, isAuthenticated } = useAuth();

  const allContent = [...movies, ...series];
  const favoriteItems = allContent.filter((m) =>
    currentUser?.favorites.includes(m.id)
  );

  return (
    <UserLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="flex items-center space-x-3 border-b border-slate-200 pb-6">
          <div className="p-3 bg-red-50 text-brand-red rounded-2xl border border-red-100">
            <Heart className="w-6 h-6 fill-brand-red" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">បញ្ជីភាពយន្ត និងរឿងភាគចូលចិត្ត</h1>
            <p className="text-sm text-slate-500 font-medium">មាតិកាដែលអ្នកបានរក្សាទុកក្នុងបណ្ណាល័យផ្ទាល់ខ្លួន</p>
          </div>
        </div>

        {!isAuthenticated ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-4 shadow-sm">
            <p className="text-slate-600 font-medium">សូមចូលប្រើប្រាស់គណនី ដើម្បីរក្សាទុក និងគ្រប់គ្រងភាពយន្តចូលចិត្តរបស់អ្នក។</p>
            <Link href="/login" className="inline-block bg-brand-red text-white px-6 py-2.5 rounded-xl font-bold">
              ចូលប្រើប្រាស់ឥឡូវនេះ
            </Link>
          </div>
        ) : (
          <MovieGrid
            movies={favoriteItems}
            subtitle={`មាន ${favoriteItems.length} ចំណងជើងក្នុងបញ្ជីរបស់អ្នក`}
          />
        )}
      </div>
    </UserLayout>
  );
}
