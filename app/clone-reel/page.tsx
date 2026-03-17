'use client';

import { useState } from 'react';
import { useStore, getVisibleModels } from '@/lib/store';

import { Play, Upload, Film, Check, Clock, X, Copy, Sparkles, HelpCircle } from 'lucide-react';

export default function CloneReelPage() {
  const [sourceUrl, setSourceUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [timeline, setTimeline] = useState<Array<{ time: string; text: string }>>([]);
  const [processing, setProcessing] = useState(false);
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());

  const models = useStore(getVisibleModels);
  const galleryAssets = useStore((s) => s.galleryAssets);

  const analyzeVideo = async () => {
    if (!sourceUrl) return;

    setAnalyzing(true);
    setTimeline([]);

    // In a real app, this would use the reel-cloner agent
    // For now, we'll extract text from video metadata
    // This is a placeholder implementation

    try {
      // Simulate analysis with delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Placeholder: Generate some mock timeline data
      const mockTimeline = [
        { time: '00:00', text: 'New content dropping 💎' },
        { time: '00:03', text: 'Check this out 🔥' },
        { time: '00:06', text: 'Swipe to see more ➡️' },
        { time: '00:09', text: 'That girl era 💅' },
        { time: '00:12', text: 'Link in bio 🔗' },
      ];

      setTimeline(mockTimeline);
    } catch (error) {
      console.error('Error analyzing video:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const applyToAssets = async () => {
    if (selectedAssetIds.size === 0 || timeline.length === 0) return;

    setProcessing(true);

    try {
      // In a real app, this would call reel-cloner agent
      // to actually process and generate new videos with overlays

      await new Promise((resolve) => setTimeout(resolve, 1500));

      setProcessing(false);
      setSelectedAssetIds(new Set());
    } catch (error) {
      console.error('Error applying overlays:', error);
      setProcessing(false);
    }
  };

  const toggleAsset = (id: string) => {
    setSelectedAssetIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const clearSelection = () => setSelectedAssetIds(new Set());

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Film className="w-5 h-5" />
          <h1 className="text-xl font-bold">Clone Reel</h1>
        </div>
        <button
          onClick={() => window.location.href = '/'}
          className="p-2 hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex">
        {/* Left sidebar - Reference input */}
        <div className="w-80 border-r border-white/10 p-4 flex-shrink-0">
          <h2 className="text-sm font-semibold mb-3">Reference Video</h2>

          <div className="space-y-3">
            {/* URL Input */}
            <div>
              <label className="text-xs text-white/70 mb-1.5">Video URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="Paste TikTok/Instagram reel URL…"
                  className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/50 focus:outline-none focus:border-white/40"
                />
                <button
                  onClick={analyzeVideo}
                  disabled={!sourceUrl || analyzing}
                  className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  {analyzing ? 'Analyzing…' : 'Analyze'}
                </button>
              </div>
            </div>

            {/* Timeline Display */}
            {analyzing && (
              <div className="flex items-center justify-center py-4">
                <Clock className="w-5 h-5 animate-spin text-violet-400" />
                <span className="text-sm text-white/70">Analyzing video…</span>
              </div>
            )}

            {timeline.length > 0 && !analyzing && (
              <div className="space-y-2">
                <h3 className="text-xs text-white/50 mb-2">Extracted Timeline</h3>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {timeline.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center py-1.5 border-b border-white/10">
                      <span className="text-xs text-white/50 w-14 font-mono shrink-0">
                        {item.time}
                      </span>
                      <span className="text-sm flex-1">{item.text}</span>
                      <button
                        onClick={() => setTimeline((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-white/50 hover:text-red-400 shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right side - Gallery selection */}
        <div className="flex-1 p-4 border-l border-white/10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Select Assets</h2>
            {selectedAssetIds.size > 0 && (
              <button
                onClick={clearSelection}
                className="text-xs text-white/70 hover:text-white flex items-center gap-1"
              >
                Clear selection ({selectedAssetIds.size})
              </button>
            )}
            <span className="text-xs text-white/50">
              {selectedAssetIds.size} selected
            </span>
          </div>

          {/* Asset grid */}
          <div className="grid grid-cols-2 gap-3 max-h-[calc(100vh-200px)] overflow-y-auto">
            {galleryAssets.map((asset) => (
              <div
                key={asset.id}
                onClick={() => toggleAsset(asset.id)}
                className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                  selectedAssetIds.has(asset.id)
                    ? 'border-violet-500 bg-violet-500/20'
                    : 'border-white/20 bg-white/5 hover:bg-white/10'
                }`}
              >
                <img
                  src={asset.fileUrl}
                  alt={asset.fileName}
                  className="w-full h-32 object-cover"
                />
                {selectedAssetIds.has(asset.id) && (
                  <div className="absolute top-2 left-2 bg-violet-600 text-white text-xs px-2 py-0.5 rounded-full">
                    <Check className="w-3 h-3" />
                  </div>
                )}
                <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded">
                  {asset.fileType === 'video' ? 'Video' : 'Image'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="border-t border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-white/50" />
          <span className="text-xs text-white/50">
            Timeline from reference will be overlaid on selected assets
          </span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setSourceUrl('')}
            disabled={processing}
            className="text-white/70 hover:text-white disabled:opacity-50 text-sm px-4 py-2 rounded-lg"
          >
            Reset
          </button>
          <button
            onClick={applyToAssets}
            disabled={selectedAssetIds.size === 0 || timeline.length === 0 || processing}
            className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-semibold px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            {processing ? (
              <>
                <Copy className="w-4 h-4 animate-spin" />
                <span>Applying…</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Apply to {selectedAssetIds.size} Assets</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
