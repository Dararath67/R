'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { api } from '@/lib/api';
import { useData } from '@/context/DataContext';
import {
  Globe,
  DownloadCloud,
  CheckCircle,
  AlertTriangle,
  Play,
  ExternalLink,
  RefreshCw,
  Search,
  Film,
  Check,
  X,
  Layers,
  Sparkles,
  Info,
  SlidersHorizontal,
} from 'lucide-react';

interface ScrapedItem {
  id?: string;
  title: string;
  description?: string;
  videoUrl: string;
  posterUrl?: string;
  backdropUrl?: string;
  releaseYear?: number;
  genres?: string[];
  duration?: string;
  rating?: number;
  sourceUrl?: string;
  status: 'ready' | 'already_exists' | 'imported';
}

export default function AdminCrawlerPage() {
  const { refreshData } = useData();
  const [siteUrl, setSiteUrl] = useState('https://www.jvpkh.xyz');
  const [limit, setLimit] = useState<number>(25);
  const [isScanning, setIsScanning] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [scrapedItems, setScrapedItems] = useState<ScrapedItem[]>([]);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [previewVideo, setPreviewVideo] = useState<{ url: string; title: string } | null>(null);
  
  // Feedback alert / banner
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Scan or Auto Import
  const handleScan = async (autoSave: boolean = false) => {
    if (!siteUrl.trim()) {
      setStatusMessage({ type: 'error', text: 'សូមបញ្ចូល Website Link ឬ Domain ជាមុនសិន!' });
      return;
    }

    setIsScanning(true);
    setStatusMessage(null);

    try {
      const res = await api.crawlBulkSiteMovies(siteUrl.trim(), limit, autoSave);
      setScrapedItems(res.items || []);

      // Auto-select all ready items
      const readyUrls = new Set<string>();
      (res.items || []).forEach((item) => {
        if (item.status === 'ready') {
          readyUrls.add(item.videoUrl);
        }
      });
      setSelectedUrls(readyUrls);

      if (autoSave) {
        setStatusMessage({
          type: 'success',
          text: `ស្កេន និងបាន Import ភាពយន្តដោយស្វ័យប្រវត្តចំនួន ${res.importedCount} រឿង (${res.duplicateCount} រឿងមានក្នុងប្រព័ន្ធរួចហើយ)!`,
        });
        if (refreshData) refreshData();
      } else {
        setStatusMessage({
          type: 'info',
          text: `ស្កេនឃើញភាពយន្តចំនួន ${res.totalScanned} រឿង (${res.duplicateCount} រឿងមានក្នុងប្រព័ន្ធរួចហើយ)!`,
        });
      }
    } catch (err: any) {
      console.error('Crawler error:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'បរាជ័យក្នុងការទាញយកទិន្នន័យពីវេបសាយ! សូមពិនិត្យមើល Link ម្តងទៀត។',
      });
    } finally {
      setIsScanning(false);
    }
  };

  // Import Selected
  const handleImportSelected = async () => {
    const toImport = scrapedItems.filter(
      (item) => selectedUrls.has(item.videoUrl) && item.status !== 'imported'
    );

    if (toImport.length === 0) {
      setStatusMessage({
        type: 'error',
        text: 'សូមជ្រើសរើសភាពយន្តយ៉ាងហោចណាស់មួយរឿងដើម្បី Import!',
      });
      return;
    }

    setIsImporting(true);
    setStatusMessage(null);

    try {
      const res = await api.importBulkMovies(toImport);
      
      // Update status in local table
      const importedUrlSet = new Set(toImport.map((i) => i.videoUrl));
      setScrapedItems((prev) =>
        prev.map((item) =>
          importedUrlSet.has(item.videoUrl) ? { ...item, status: 'imported' } : item
        )
      );

      // Remove imported from selected set
      setSelectedUrls((prev) => {
        const next = new Set(prev);
        importedUrlSet.forEach((u) => next.delete(u));
        return next;
      });

      setStatusMessage({
        type: 'success',
        text: `បាន Import ភាពយន្ត ${res.imported} រឿងចូលក្នុង Database ដោយជោគជ័យ! (${res.duplicates} រឿងមានរួចហើយ)`,
      });

      if (refreshData) refreshData();
    } catch (err: any) {
      console.error('Import error:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'បរាជ័យក្នុងការ Import ភាពយន្តចូលប្រព័ន្ធ!',
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Toggle selection
  const toggleSelect = (videoUrl: string) => {
    setSelectedUrls((prev) => {
      const next = new Set(prev);
      if (next.has(videoUrl)) {
        next.delete(videoUrl);
      } else {
        next.add(videoUrl);
      }
      return next;
    });
  };

  // Select / Deselect all ready items
  const toggleSelectAll = () => {
    const readyItems = filteredItems.filter((i) => i.status !== 'already_exists');
    const allSelected = readyItems.length > 0 && readyItems.every((i) => selectedUrls.has(i.videoUrl));

    setSelectedUrls((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        readyItems.forEach((i) => next.delete(i.videoUrl));
      } else {
        readyItems.forEach((i) => next.add(i.videoUrl));
      }
      return next;
    });
  };

  // Filtering
  const filteredItems = scrapedItems.filter((item) =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalScanned = scrapedItems.length;
  const readyCount = scrapedItems.filter((i) => i.status === 'ready').length;
  const existingCount = scrapedItems.filter((i) => i.status === 'already_exists').length;
  const importedCount = scrapedItems.filter((i) => i.status === 'imported').length;

  return (
    <AdminLayout>
      <div className="space-y-6 pb-24">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div>
            <div className="flex items-center space-x-2 text-brand-red font-bold text-xs uppercase tracking-wider mb-1">
              <Globe className="w-4 h-4" />
              <span>Bulk Website Movie Crawler</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900">ទាញយកភាពយន្តជាបណ្ដុំពីវេបសាយ</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              ទាញយកភាពយន្តស្វ័យប្រវត្តពីគេហទំព័រទាំងមូល (ស្គាល់ stream .mp4, poster, ចំណងជើង និងឆ្នាំបញ្ចេញ)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleScan(false)}
              disabled={isScanning || isImporting}
              className="flex items-center space-x-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'កំពុងស្កេន...' : 'ស្កេនមើលសិន (Scan Preview)'}</span>
            </button>

            <button
              onClick={() => handleScan(true)}
              disabled={isScanning || isImporting}
              className="flex items-center space-x-2 px-4 py-2.5 bg-brand-red hover:bg-red-700 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-brand-red/20 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <DownloadCloud className={`w-4 h-4 ${isScanning ? 'animate-bounce' : ''}`} />
              <span>ទាញយក និងរក្សាទុកទាំងអស់ (Auto Import All)</span>
            </button>
          </div>
        </div>

        {/* Input & Crawler Controls */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-8 space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                <Globe className="w-4 h-4 text-brand-red" />
                <span>អាសយដ្ឋានគេហទំព័រ (Website URL / Domain)</span>
              </label>
              <input
                type="url"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                placeholder="https://www.jvpkh.xyz ឬ Domain ផ្សេងៗ..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all"
              />
            </div>

            <div className="md:col-span-4 space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                <span>ចំនួនស្កេនអតិបរមា (Max Posts Limit)</span>
              </label>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all"
              >
                <option value={10}>10 រឿងដំបូង</option>
                <option value={25}>25 រឿងដំបូង (ណែនាំ)</option>
                <option value={50}>50 រឿងដំបូង</option>
                <option value={100}>100 រឿងដំបូង (ច្រើនបំផុត)</option>
              </select>
            </div>
          </div>

          {/* Quick chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-400">វេបសាយគំរូ៖</span>
            {['https://www.jvpkh.xyz'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setSiteUrl(preset)}
                className={`text-[11px] px-3 py-1 rounded-lg font-semibold transition-all border ${
                  siteUrl === preset
                    ? 'bg-red-50 text-brand-red border-red-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Feedback Alert */}
        {statusMessage && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between text-xs sm:text-sm font-medium animate-fade-in ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : statusMessage.type === 'error'
                ? 'bg-red-50 text-red-800 border-red-200'
                : 'bg-blue-50 text-blue-800 border-blue-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              {statusMessage.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />}
              {statusMessage.type === 'error' && <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />}
              {statusMessage.type === 'info' && <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="p-1 hover:opacity-75 transition-opacity cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Summary Stat Cards */}
        {totalScanned > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-3">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400">បានស្កេនសរុប</p>
                <p className="text-xl font-black text-slate-900">{totalScanned}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-3">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400">ត្រៀមរួចរាល់</p>
                <p className="text-xl font-black text-emerald-600">{readyCount}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-3">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400">មានក្នុង DB រួច</p>
                <p className="text-xl font-black text-amber-600">{existingCount}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-3">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                <DownloadCloud className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400">បាន Import ថ្មី</p>
                <p className="text-xl font-black text-purple-600">{importedCount}</p>
              </div>
            </div>
          </div>
        )}

        {/* Scraped Results Section */}
        {totalScanned > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Table Action Bar */}
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="flex items-center space-x-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  <span>
                    {filteredItems.filter((i) => i.status !== 'already_exists').length > 0 &&
                    filteredItems.filter((i) => i.status !== 'already_exists').every((i) => selectedUrls.has(i.videoUrl))
                      ? 'ដោះការជ្រើសរើសទាំងអស់'
                      : 'ជ្រើសរើសទាំងអស់'}
                  </span>
                </button>
                <span className="text-xs text-slate-500 font-medium">
                  បានជ្រើសរើស <strong className="text-slate-900">{selectedUrls.size}</strong> រឿង
                </span>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ស្វែងរកក្នុងបញ្ជីស្កេន..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
                />
              </div>
            </div>

            {/* Movies List / Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="p-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          filteredItems.length > 0 &&
                          filteredItems.filter((i) => i.status !== 'already_exists').every((i) => selectedUrls.has(i.videoUrl))
                        }
                        onChange={toggleSelectAll}
                        className="rounded border-slate-300 text-brand-red focus:ring-brand-red cursor-pointer"
                      />
                    </th>
                    <th className="p-4">រូបភាព / ចំណងជើង</th>
                    <th className="p-4">ឆ្នាំ / ប្រភេទ</th>
                    <th className="p-4">Video Stream</th>
                    <th className="p-4 text-center">ស្ថានភាព</th>
                    <th className="p-4 text-right">សកម្មភាព</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map((item, index) => {
                    const isSelected = selectedUrls.has(item.videoUrl);
                    const isAlready = item.status === 'already_exists';
                    const isDone = item.status === 'imported';

                    return (
                      <tr
                        key={item.videoUrl || index}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isSelected ? 'bg-red-50/30' : ''
                        }`}
                      >
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isAlready}
                            onChange={() => toggleSelect(item.videoUrl)}
                            className="rounded border-slate-300 text-brand-red focus:ring-brand-red cursor-pointer disabled:opacity-40"
                          />
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-16 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 border border-slate-200">
                              {item.posterUrl ? (
                                <img
                                  src={item.posterUrl}
                                  alt={item.title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                  <Film className="w-6 h-6" />
                                </div>
                              )}
                            </div>
                            <div className="space-y-1 max-w-sm">
                              <p className="font-bold text-slate-900 line-clamp-1">{item.title}</p>
                              {item.description && (
                                <p className="text-[11px] text-slate-500 line-clamp-1">{item.description}</p>
                              )}
                              {item.sourceUrl && (
                                <a
                                  href={item.sourceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center space-x-1 text-[10px] text-blue-600 hover:underline"
                                >
                                  <span>ប្រភពដើម</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="space-y-1">
                            <span className="font-semibold text-slate-700">{item.releaseYear || 'N/A'}</span>
                            <div className="flex flex-wrap gap-1">
                              {(item.genres || []).slice(0, 2).map((g) => (
                                <span
                                  key={g}
                                  className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium"
                                >
                                  {g}
                                </span>
                              ))}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-2 max-w-xs">
                            <span className="font-mono text-[10px] text-slate-500 truncate bg-slate-50 px-2 py-1 rounded border border-slate-200">
                              {item.videoUrl}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          {isAlready && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              មានក្នុង DB រួច
                            </span>
                          )}
                          {isDone && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              <Check className="w-3 h-3 mr-1" />
                              បាន Import
                            </span>
                          )}
                          {!isAlready && !isDone && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Sparkles className="w-3 h-3 mr-1" />
                              ត្រៀមរួចរាល់
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            type="button"
                            onClick={() => setPreviewVideo({ url: item.videoUrl, title: item.title })}
                            className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            <Play className="w-3 h-3" />
                            <span>តេស្តមើល</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Floating Action Bar when items are selected */}
        {selectedUrls.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md text-white px-6 py-3.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center space-x-4 animate-slide-up">
            <span className="text-xs font-bold">
              បានជ្រើសរើស <strong>{selectedUrls.size}</strong> ភាពយន្ត
            </span>
            <div className="h-4 w-px bg-slate-700" />
            <button
              onClick={handleImportSelected}
              disabled={isImporting}
              className="flex items-center space-x-2 px-4 py-2 bg-brand-red hover:bg-red-700 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-brand-red/20 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <DownloadCloud className={`w-4 h-4 ${isImporting ? 'animate-bounce' : ''}`} />
              <span>{isImporting ? 'កំពុងបញ្ចូល...' : 'បញ្ចូលភាពយន្តទាំងនេះចូលប្រព័ន្ធ (Import Selected)'}</span>
            </button>
          </div>
        )}

        {/* Empty placeholder before scanning */}
        {totalScanned === 0 && !isScanning && (
          <div className="bg-white p-12 rounded-2xl border border-slate-200/80 shadow-xs text-center space-y-4">
            <div className="w-16 h-16 bg-red-50 text-brand-red rounded-full flex items-center justify-center mx-auto">
              <Globe className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-base font-bold text-slate-800">ត្រៀមស្កេនទាញយកភាពយន្តជាបណ្ដុំ</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                គ្រាន់តែបញ្ចូល Link វេបសាយ (ដូចជា jvpkh.xyz) រួចចុចប៊ូតុង <strong>ស្កេនមើលសិន</strong> ឬ <strong>ទាញយក និងរក្សាទុកទាំងអស់</strong> ដើម្បីបញ្ចូលភាពយន្តទាំងអស់ចូលប្រព័ន្ធភ្លាមៗ។
              </p>
            </div>
          </div>
        )}

        {/* Video Preview Modal */}
        {previewVideo && typeof document !== 'undefined' && createPortal(
          <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl animate-scale-up">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-white">
                  <Play className="w-4 h-4 text-brand-red" />
                  <h3 className="text-sm font-bold truncate max-w-lg">{previewVideo.title}</h3>
                </div>
                <button
                  onClick={() => setPreviewVideo(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 bg-black aspect-video flex items-center justify-center">
                <video
                  src={previewVideo.url.startsWith('http') ? `/api/proxy/video?url=${encodeURIComponent(previewVideo.url)}` : previewVideo.url}
                  controls
                  autoPlay
                  className="w-full h-full object-contain rounded-lg"
                />
              </div>
              <div className="p-3 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span className="font-mono text-[10px] truncate max-w-md">{previewVideo.url}</span>
                <button
                  onClick={() => setPreviewVideo(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-xs cursor-pointer"
                >
                  បិទផ្ទាំង
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </AdminLayout>
  );
}
