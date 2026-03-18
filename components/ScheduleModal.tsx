'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  X, Calendar, Clock, Check, ChevronDown, Plus, Trash2,
  Sparkles, Type, Image as ImageIcon, Zap, Download,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { Platform, CaptionStyle, TikTokTextPosition } from '@/types/models';
import { PLATFORM_THEMES } from '@/lib/constants/platform';
import { TIKTOK_TEXT_PRESETS, getTikTokTextPreviewCSS } from '@/lib/utils/slideshowRenderer';
import { GalleryAsset } from '@/types/models';
import ImageEditor, { EditableImage, ImageEditorResult } from '@/components/ImageEditor';

// ─── Types ─────────────────────────────────────────────────────────────────

interface ScheduleModalProps {
  onClose: () => void;
  assetIds: string[];
  onComplete: () => void;
}

interface PlatformScheduleConfig {
  platform: Platform;
  selected: boolean;
  scheduleMode: 'specific' | 'nextSlot';
  specificDate?: string; // YYYY-MM-DD
  specificTime?: string; // HH:MM
  postType: string; // e.g., 'instagram_post', 'tiktok_slideshow'
}

interface TikTokSlideCaption {
  text: string;
  style: CaptionStyle;
}

// ─── Platform Selector Component ─────────────────────────────────────────────

function PlatformSelector({
  platforms,
  selectedPlatforms,
  onToggle,
}: {
  platforms: Platform[];
  selectedPlatforms: Platform[];
  onToggle: (platform: Platform) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {platforms.map((platform) => {
        const theme = PLATFORM_THEMES[platform];
        const isSelected = selectedPlatforms.includes(platform);
        const Icon = theme.icon;

        return (
          <button
            key={platform}
            onClick={() => onToggle(platform)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
              isSelected
                ? theme.active
                : 'bg-white/5 border-white/10 text-white/60 hover:border-white/20'
            }`}
          >
            <Icon size={18} />
            <span className="text-sm font-semibold">{theme.label}</span>
            {isSelected && <Check className="w-4 h-4 ml-1" />}
          </button>
        );
      })}
    </div>
  );
}

// ─── Platform Schedule Card Component ─────────────────────────────────────────

function PlatformScheduleCard({
  config,
  onUpdate,
}: {
  config: PlatformScheduleConfig;
  onUpdate: (updates: Partial<PlatformScheduleConfig>) => void;
}) {
  const theme = PLATFORM_THEMES[config.platform];

  return (
    <div className={`card p-4 ${config.selected ? 'ring-1 ' + theme.ring : 'opacity-50'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.selected}
            onChange={(e) => onUpdate({ selected: e.target.checked })}
            className="w-4 h-4 rounded accent-violet-500"
          />
          <theme.icon size={20} className={theme.text} />
          <span className={`text-sm font-semibold ${config.selected ? 'text-white' : 'text-white/50'}`}>
            {theme.label}
          </span>
        </div>
      </div>

      {config.selected && (
        <div className="space-y-3">
          {/* Schedule mode toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onUpdate({ scheduleMode: 'specific' })}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                config.scheduleMode === 'specific'
                  ? 'bg-violet-500/20 border-violet-500 text-violet-300'
                  : 'bg-white/5 border-white/10 text-white/60'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Specific Time
            </button>
            <button
              onClick={() => onUpdate({ scheduleMode: 'nextSlot' })}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                config.scheduleMode === 'nextSlot'
                  ? 'bg-violet-500/20 border-violet-500 text-violet-300'
                  : 'bg-white/5 border-white/10 text-white/60'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              Next Slot
            </button>
          </div>

          {/* Specific time inputs */}
          {config.scheduleMode === 'specific' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-white/50 mb-1 block">Date</label>
                <input
                  type="date"
                  value={config.specificDate || ''}
                  onChange={(e) => onUpdate({ specificDate: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-white/50 mb-1 block">Time</label>
                <input
                  type="time"
                  value={config.specificTime || ''}
                  onChange={(e) => onUpdate({ specificTime: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>
          )}

          {/* Next slot info */}
          {config.scheduleMode === 'nextSlot' && (
            <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg px-3 py-2">
              <p className="text-xs text-violet-300">Next available: <span className="font-semibold text-white">Tomorrow 2:00 PM</span></p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── TikTok Caption Editor Component ─────────────────────────────────────────

function TikTokCaptionEditor({
  assets,
  captions,
  onUpdate,
  onApplyStyleToAll,
}: {
  assets: GalleryAsset[];
  captions: Record<string, TikTokSlideCaption>;
  onUpdate: (assetId: string, updates: Partial<TikTokSlideCaption>) => void;
  onApplyStyleToAll: (style: CaptionStyle) => void;
}) {
  const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>('classic');

  return (
    <div className="space-y-4">
      {/* Global style preset selector */}
      <div>
        <label className="text-xs text-white/70 mb-2 block">Text Style Preset</label>
        <div className="flex flex-wrap gap-2">
          {Object.keys(TIKTOK_TEXT_PRESETS).map((preset) => (
            <button
              key={preset}
              onClick={() => {
                setSelectedPreset(preset);
                onApplyStyleToAll(TIKTOK_TEXT_PRESETS[preset]!);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                selectedPreset === preset
                  ? 'bg-violet-500 border-violet-500 text-white'
                  : 'bg-white/5 border-white/10 text-white/60 hover:border-white/20'
              }`}
            >
              {preset.charAt(0).toUpperCase() + preset.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Per-slide caption inputs */}
      <div className="space-y-3">
        {assets.map((asset, index) => {
          const caption = captions[asset.id] || { text: '', style: TIKTOK_TEXT_PRESETS.classic };
          const isExpanded = expandedAssetId === asset.id;
          const previewCSS = getTikTokTextPreviewCSS({
            imageUrl: asset.fileUrl,
            text: caption.text,
            style: caption.style,
          });

          return (
            <div key={asset.id} className="card p-4">
              {/* Header with thumbnail */}
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0" style={{ background: 'var(--bg-elevated)' }}>
                  {asset.fileType === 'image' && asset.fileUrl ? (
                    <img src={asset.fileUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-4 h-4 text-white/40" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-xs text-white/50 mb-1">Slide {index + 1}</p>
                  <input
                    type="text"
                    value={caption.text}
                    onChange={(e) => onUpdate(asset.id, { text: e.target.value })}
                    placeholder="Enter caption text..."
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <button
                  onClick={() => setExpandedAssetId(isExpanded ? null : asset.id)}
                  className="btn-icon flex-shrink-0"
                >
                  <Type className={`w-4 h-4 ${isExpanded ? 'text-violet-400' : ''}`} />
                </button>
              </div>

              {/* Expanded style controls */}
              {isExpanded && caption.text && (
                <div className="border-t border-white/10 pt-3 mt-3 space-y-3">
                  {/* Font family */}
                  <div>
                    <label className="text-[10px] text-white/50 mb-1 block">Font</label>
                    <select
                      value={caption.style.fontFamily}
                      onChange={(e) => onUpdate(asset.id, {
                        style: { ...caption.style, fontFamily: e.target.value as any },
                      })}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                    >
                      <option value="SF-Pro-Display-Bold">SF Pro Display Bold</option>
                      <option value="SF-Pro-Text-Semibold">SF Pro Text Semibold</option>
                      <option value="SF-Pro-Text-Regular">SF Pro Text Regular</option>
                      <option value="Roboto-Bold">Roboto Bold</option>
                      <option value="Roboto-Medium">Roboto Medium</option>
                    </select>
                  </div>

                  {/* Font size */}
                  <div>
                    <label className="text-[10px] text-white/50 mb-1 block">Size: {caption.style.fontSize}px</label>
                    <input
                      type="range"
                      min="16"
                      max="64"
                      value={caption.style.fontSize}
                      onChange={(e) => onUpdate(asset.id, {
                        style: { ...caption.style, fontSize: parseInt(e.target.value) },
                      })}
                      className="w-full h-1 appearance-none bg-white/20 rounded-full"
                      style={{
                        background: `linear-gradient(to right, #7c3aed 0%, #7c3aed ${(caption.style.fontSize - 16) / 48 * 100}%, #ffffff20 ${(caption.style.fontSize - 16) / 48 * 100}%, #ffffff20 100%)`,
                      }}
                    />
                  </div>

                  {/* Text color */}
                  <div>
                    <label className="text-[10px] text-white/50 mb-1 block">Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={caption.style.color}
                        onChange={(e) => onUpdate(asset.id, {
                          style: { ...caption.style, color: e.target.value },
                        })}
                        className="w-8 h-8 rounded-lg cursor-pointer border-2 border-white/20 bg-transparent p-0"
                      />
                      <input
                        type="text"
                        value={caption.style.color}
                        onChange={(e) => onUpdate(asset.id, {
                          style: { ...caption.style, color: e.target.value },
                        })}
                        className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-xs text-white uppercase font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Position */}
                  <div>
                    <label className="text-[10px] text-white/50 mb-1 block">Position</label>
                    <select
                      value={caption.style.position}
                      onChange={(e) => onUpdate(asset.id, {
                        style: { ...caption.style, position: e.target.value as any },
                      })}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                    >
                      <option value="top">Top</option>
                      <option value="top-left">Top Left</option>
                      <option value="top-right">Top Right</option>
                      <option value="center">Center</option>
                      <option value="center-left">Center Left</option>
                      <option value="center-right">Center Right</option>
                      <option value="bottom">Bottom</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="bottom-right">Bottom Right</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Platform Preview Component ───────────────────────────────────────────────

function PlatformPreview({
  platform,
  assets,
}: {
  platform: Platform;
  assets: GalleryAsset[];
}) {
  const theme = PLATFORM_THEMES[platform];

  if (assets.length === 0) return null;

  return (
    <div className="relative">
      <div className={`aspect-[9/16] w-full rounded-xl overflow-hidden ${theme.bgDim} border-2 ${theme.border}`}>
        {assets.length === 1 ? (
          <img
            src={assets[0].fileUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full grid grid-rows-2">
            <div className="relative">
              <img src={assets[0]?.fileUrl} alt="" className="w-full h-full object-cover" />
              <div className="absolute top-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] text-white font-semibold">
                1/2
              </div>
            </div>
            <div className="relative">
              <img src={assets[1]?.fileUrl} alt="" className="w-full h-full object-cover" />
              <div className="absolute top-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] text-white font-semibold">
                2/2
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Platform badge */}
      <div className="absolute -top-2 -right-2 bg-black/90 backdrop-blur-sm border border-white/20 rounded-lg px-2 py-1 flex items-center gap-1">
        <theme.icon size={14} />
        <span className="text-[10px] font-semibold text-white">{theme.shortLabel}</span>
      </div>
    </div>
  );
}

// ─── Main ScheduleModal Component ───────────────────────────────────────────

export default function ScheduleModal({ onClose, assetIds, onComplete }: ScheduleModalProps) {
  const { stagedAssets, addPost, setWorkflowStep } = useStore();

  const assets = useMemo(
    () => stagedAssets.filter((sa) => assetIds.includes(sa.asset.id) && !sa.skipped).map((sa) => sa.asset),
    [stagedAssets, assetIds]
  );

  const [step, setStep] = useState<'platforms' | 'tiktok-captions' | 'preview'>('platforms');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['instagram']);
  const [scheduleConfigs, setScheduleConfigs] = useState<Record<Platform, PlatformScheduleConfig>>({
    instagram: { platform: 'instagram', selected: true, scheduleMode: 'nextSlot', postType: 'instagram_post' },
    tiktok: { platform: 'tiktok', selected: false, scheduleMode: 'nextSlot', postType: 'tiktok_slideshow' },
    x: { platform: 'x', selected: false, scheduleMode: 'nextSlot', postType: 'x_post' },
    threads: { platform: 'threads', selected: false, scheduleMode: 'nextSlot', postType: 'threads_post' },
    fanvue: { platform: 'fanvue', selected: false, scheduleMode: 'nextSlot', postType: 'fanvue_post' },
  });

  const [tiktokCaptions, setTiktokCaptions] = useState<Record<string, TikTokSlideCaption>>({});

  // Toggle platform selection
  const togglePlatform = useCallback((platform: Platform) => {
    setSelectedPlatforms((prev) => {
      const isSelected = prev.includes(platform);
      if (isSelected && prev.length === 1) {
        return prev; // Don't deselect last platform
      }
      return isSelected
        ? prev.filter((p) => p !== platform)
        : [...prev, platform];
    });

    setScheduleConfigs((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], selected: !prev[platform].selected },
    }));
  }, []);

  // Update TikTok caption for specific asset
  const updateTikTokCaption = useCallback((assetId: string, updates: Partial<TikTokSlideCaption>) => {
    setTiktokCaptions((prev) => ({
      ...prev,
      [assetId]: { ...prev[assetId], ...updates },
    }));
  }, []);

  // Apply style to all TikTok captions
  const applyStyleToAll = useCallback((style: CaptionStyle) => {
    setTiktokCaptions((prev) => {
      const updated: Record<string, TikTokSlideCaption> = {};
      for (const [id, caption] of Object.entries(prev)) {
        updated[id] = { ...caption, style };
      }
      return updated;
    });
  }, []);

  // Handle schedule complete
  const handleSchedule = useCallback(() => {
    // Create posts for each selected platform
    for (const platform of selectedPlatforms) {
      const config = scheduleConfigs[platform];
      if (!config.selected) continue;

      const scheduledTime = config.specificDate && config.specificTime
        ? `${config.specificDate}T${config.specificTime}:00`
        : new Date(Date.now() + 86400000).toISOString(); // Tomorrow as default

      addPost({
        id: `post-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        modelId: 'default',
        platform,
        postType: config.postType as any,
        scheduledTime,
        status: 'scheduled',
        description: '',
        assets: assets.map((a, i) => ({
          id: `asset-${Date.now()}-${i}-${Math.random().toString(36).slice(2)}`,
          postId: '',
          fileUrl: a.fileUrl,
          fileName: a.fileName,
          fileType: a.fileType,
          order: i + 1,
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    onComplete();
  }, [selectedPlatforms, scheduleConfigs, assets, addPost, onComplete]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.9)' }}>
      <div className="card w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <h2 className="text-lg font-bold text-white">Schedule Posts</h2>
          <button onClick={onClose} className="btn-icon">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
          {/* Step indicators */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {(['platforms', 'tiktok-captions', 'preview'] as const).map((s, i) => {
              const isActive = step === s;
              const isPast = ['platforms', 'tiktok-captions', 'preview'].indexOf(step) > i;
              const stepNames: Record<string, string> = {
                'platforms': 'Platforms',
                'tiktok-captions': 'TikTok Captions',
                'preview': 'Preview',
              };
              return (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                      isActive ? 'bg-violet-500 text-white' : isPast ? 'bg-green-500 text-white' : 'bg-white/10 text-white/40'
                    }`}
                  >
                    {i + 1}
                  </div>
                  <span className={`text-sm ${isActive ? 'text-white' : isPast ? 'text-green-400' : 'text-white/40'}`}>
                    {stepNames[s]}
                  </span>
                  {i < 2 && <div className={`w-12 h-px ${isPast ? 'bg-green-500' : 'bg-white/10'}`} />}
                </div>
              );
            })}
          </div>

          {/* Step: Platform Selection */}
          {step === 'platforms' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-white mb-2">Select Platforms</h3>
                <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                  Choose which platforms to schedule these assets to. Each platform will use the appropriate post type.
                </p>
                <PlatformSelector
                  platforms={['instagram', 'tiktok', 'x', 'threads', 'fanvue'] as Platform[]}
                  selectedPlatforms={selectedPlatforms}
                  onToggle={togglePlatform}
                />
              </div>

              {/* Platform schedule configs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(Object.keys(scheduleConfigs) as Platform[]).map((platform) => (
                  <PlatformScheduleCard
                    key={platform}
                    config={scheduleConfigs[platform]}
                    onUpdate={(updates) => setScheduleConfigs((prev) => ({
                      ...prev,
                      [platform]: { ...prev[platform], ...updates },
                    }))}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Step: TikTok Captions */}
          {step === 'tiktok-captions' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-violet-400" />
                <div>
                  <h3 className="text-sm font-semibold text-white">TikTok Slideshow Captions</h3>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Add text overlays for each slide. This text will appear ON the images.
                  </p>
                </div>
              </div>

              <TikTokCaptionEditor
                assets={assets}
                captions={tiktokCaptions}
                onUpdate={updateTikTokCaption}
                onApplyStyleToAll={applyStyleToAll}
              />
            </div>
          )}

          {/* Step: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white mb-4">Preview</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {selectedPlatforms.map((platform) => (
                  <PlatformPreview key={platform} platform={platform} assets={assets} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Cancel
          </button>
          <div className="flex items-center gap-3">
            {step !== 'platforms' && (
              <button
                onClick={() => {
                  if (step === 'preview') setStep('tiktok-captions');
                  else if (step === 'tiktok-captions') setStep('platforms');
                }}
                className="btn-ghost text-sm flex items-center gap-1.5"
              >
                <ChevronDown className="w-4 h-4 rotate-90" />
                Back
              </button>
            )}
            <button
              onClick={() => {
                if (step === 'platforms') {
                  if (selectedPlatforms.includes('tiktok') && assets.length > 1) {
                    setStep('tiktok-captions');
                  } else {
                    setStep('preview');
                  }
                } else if (step === 'tiktok-captions') {
                  setStep('preview');
                } else if (step === 'preview') {
                  handleSchedule();
                }
              }}
              disabled={selectedPlatforms.length === 0}
              className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {step === 'preview' ? (
                <>
                  <Calendar className="w-4 h-4" />
                  Schedule {selectedPlatforms.length} Post{selectedPlatforms.length !== 1 ? 's' : ''}
                </>
              ) : (
                'Continue'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
