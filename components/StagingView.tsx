'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  ChevronLeft, Film, X, Pencil, Calendar, Check, Loader,
  Sparkles, Layers, Type, CheckCircle2, Search, Rocket,
  BookOpen, ChevronRight,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import ImageEditor, { EditableImage, ImageEditorResult } from '@/components/ImageEditor';
import { renderTikTokTextOverlay, TIKTOK_TEXT_PRESETS } from '@/lib/utils/slideshowRenderer';
import { CaptionStyle, PostReference } from '@/types/models';
import FleetBuilder from '@/components/FleetBuilder';

// ─── Style presets ────────────────────────────────────────────────────────────

const STYLE_PRESETS = [
  { key: 'classic',  label: 'Classic' },
  { key: 'minimal',  label: 'Minimal' },
  { key: 'punchy',   label: 'Punchy' },
  { key: 'subtitle', label: 'Subtitle' },
] as const;

// ─── Caption Panel ────────────────────────────────────────────────────────────

interface CaptionPanelProps {
  assetId: string;
  assetUrl: string;
  assetType: 'image' | 'video';
  renderedUrl?: string;
  captionText?: string;
  postReferences: PostReference[];
  onClose: () => void;
  onRendered: (renderedUrl: string, captionText: string) => void;
  onCaptionSaved: (captionText: string) => void;
}

function CaptionPanel({
  assetId, assetUrl, assetType, renderedUrl, captionText: initialCaption,
  postReferences, onClose, onRendered, onCaptionSaved,
}: CaptionPanelProps) {
  const [search, setSearch] = useState('');
  const [selectedRefId, setSelectedRefId] = useState<string | null>(null);
  const [text, setText] = useState(initialCaption ?? '');
  const [styleKey, setStyleKey] = useState<keyof typeof TIKTOK_TEXT_PRESETS>('classic');
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(true);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return postReferences;
    return postReferences.filter((r) =>
      (r.imageCaption ?? r.caption).toLowerCase().includes(q) ||
      r.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [postReferences, search]);

  const handlePickRef = (ref: PostReference) => {
    setSelectedRefId(ref.id);
    setText(ref.imageCaption ?? ref.caption);
    setLibraryOpen(false);
  };

  const handleRender = useCallback(async () => {
    if (!text.trim() || assetType === 'video') return;
    setIsRendering(true);
    setError(null);
    try {
      const style: CaptionStyle = { ...TIKTOK_TEXT_PRESETS[styleKey] };
      const dataUrl = await renderTikTokTextOverlay({ imageUrl: assetUrl, text: text.trim(), style, quality: 0.92 });
      onRendered(dataUrl, text.trim());
    } catch (err) {
      setError('Render failed — check image URL accessibility.');
      console.error(err);
    } finally {
      setIsRendering(false);
    }
  }, [text, styleKey, assetUrl, assetType, onRendered]);

  const handleSaveCaption = () => {
    if (!text.trim()) return;
    onCaptionSaved(text.trim());
    onClose();
  };

  // Derive current preview URL
  const previewUrl = renderedUrl ?? assetUrl;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
    >
      <div
        className="w-full max-w-lg rounded-2xl flex flex-col overflow-hidden"
        style={{ background: 'var(--bg-sidebar)', maxHeight: '92vh' }}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-violet-400" />
            <h3 className="text-sm font-semibold text-white">Caption Overlay</h3>
          </div>
          <button onClick={onClose} className="btn-icon"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">

          {/* ── Section A: Library picker ── */}
          <div className="border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <button
              onClick={() => setLibraryOpen(!libraryOpen)}
              className="w-full flex items-center justify-between px-5 py-3 text-left"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-xs font-semibold text-white">Caption Library</span>
                {postReferences.length > 0 && (
                  <span className="badge badge-violet text-[10px]">{postReferences.length}</span>
                )}
              </div>
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${libraryOpen ? 'rotate-90' : ''}`} style={{ color: 'var(--text-muted)' }} />
            </button>

            {libraryOpen && (
              <div className="px-5 pb-3 flex flex-col gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search captions..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl text-sm text-white"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none' }}
                  />
                </div>

                {filtered.length === 0 ? (
                  <p className="text-xs text-center py-3" style={{ color: 'var(--text-muted)' }}>
                    {postReferences.length === 0 ? 'No captions yet — add some in the Captions tab' : 'No matches'}
                  </p>
                ) : (
                  <div className="flex flex-col gap-1 max-h-40 overflow-y-auto no-scrollbar">
                    {filtered.map((ref) => {
                      const label = ref.imageCaption ?? ref.caption;
                      const isSelected = ref.id === selectedRefId;
                      return (
                        <button
                          key={ref.id}
                          onClick={() => handlePickRef(ref)}
                          className="text-left px-3 py-2 rounded-xl text-xs transition-all"
                          style={{
                            background: isSelected ? 'rgba(124,58,237,0.25)' : 'var(--bg-elevated)',
                            border: isSelected ? '1px solid rgba(124,58,237,0.5)' : '1px solid rgba(255,255,255,0.06)',
                            color: isSelected ? '#C4B5FD' : 'var(--text-secondary)',
                          }}
                        >
                          <span className="italic">"{label}"</span>
                          <span className="ml-2 opacity-50 not-italic">{ref.sourcePlatform}</span>
                          {ref.performanceRating === 'high' && (
                            <span className="ml-1 text-[9px] font-bold text-amber-400">HIGH</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-5 flex flex-col gap-4">
            {/* ── Section B: Caption text ── */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Caption Text</label>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{text.length} chars</span>
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type or pick from library above..."
                rows={3}
                className="w-full rounded-xl px-3 py-2 text-sm text-white resize-none"
                style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none' }}
              />
            </div>

            {/* ── Section C: Style + preview ── */}
            {assetType === 'image' && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Style</label>
                  <div className="flex gap-2 flex-wrap">
                    {STYLE_PRESETS.map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setStyleKey(key)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={styleKey === key
                          ? { background: 'rgba(124,58,237,0.8)', color: '#fff' }
                          : { background: 'var(--bg-elevated)', color: 'var(--text-muted)' }
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <div className="relative w-full rounded-xl overflow-hidden" style={{ background: '#000', aspectRatio: '4/5' }}>
                  <img src={previewUrl} alt="" className="w-full h-full object-contain" />
                  {/* Live CSS preview of text when not yet rendered */}
                  {text.trim() && !renderedUrl && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ padding: '8% 14%' }}>
                      <p className="text-white text-center font-bold text-base leading-snug w-full"
                        style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)', wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }}>
                        {text}
                      </p>
                    </div>
                  )}
                  {renderedUrl && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      Rendered
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Video: CSS preview only */}
            {assetType === 'video' && (
              <div className="relative w-full rounded-xl overflow-hidden flex items-center justify-center" style={{ background: '#000', minHeight: 160 }}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Film className="w-10 h-10 opacity-20 text-white" />
                </div>
                {text.trim() && (
                  <div className="relative z-10 px-6 py-8 text-center">
                    <p className="text-white font-bold text-lg leading-snug"
                      style={{ textShadow: '0 2px 10px rgba(0,0,0,0.9)', maxWidth: '85%', wordBreak: 'break-word' }}>
                      {text}
                    </p>
                  </div>
                )}
                {!text.trim() && (
                  <p className="relative z-10 text-xs py-6" style={{ color: 'var(--text-muted)' }}>
                    Caption preview will appear here
                  </p>
                )}
              </div>
            )}

            {error && <p className="text-xs text-red-400">{error}</p>}

            {/* Action buttons */}
            {assetType === 'image' ? (
              <button
                onClick={handleRender}
                disabled={!text.trim() || isRendering}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isRendering ? (
                  <><Loader className="w-4 h-4 animate-spin" />Rendering…</>
                ) : (
                  <><Layers className="w-4 h-4" />{renderedUrl ? 'Re-render Caption' : 'Render & Save'}</>
                )}
              </button>
            ) : (
              <button
                onClick={handleSaveCaption}
                disabled={!text.trim()}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4" />
                Save Caption to Post
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Asset Card ───────────────────────────────────────────────────────────────

interface AssetCardProps {
  asset: EditableImage;
  isEdited: boolean;
  isDownloading: boolean;
  hasTikTokCaption: boolean;
  hasRendered: boolean;
  hasCaptionText: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onCaption: () => void;
  onDownload?: () => void;
}

function AssetCard({
  asset, isEdited, isSelected, isDownloading, hasTikTokCaption,
  hasRendered, hasCaptionText, onSelect, onEdit, onRemove, onCaption, onDownload,
}: AssetCardProps) {
  return (
    <div
      onClick={onSelect}
      className={`card cursor-pointer transition-all ${isSelected ? 'ring-2 ring-violet-500' : ''}`}
    >
      <div className="relative w-full aspect-square rounded-lg overflow-hidden">
        {asset.type === 'image' && asset.url ? (
          <img src={asset.url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--bg-elevated)' }}>
            <Film className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
          </div>
        )}

        {/* Caption text preview for video */}
        {asset.type === 'video' && hasCaptionText && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40" />
        )}

        {/* Badges */}
        {hasRendered ? (
          <div className="absolute top-2 left-2 bg-green-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Rendered
          </div>
        ) : hasCaptionText ? (
          <div className="absolute top-2 left-2 bg-violet-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
            <Type className="w-3 h-3" />
            Caption
          </div>
        ) : isEdited ? (
          <div className="absolute top-2 left-2 bg-violet-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Edited
          </div>
        ) : null}

        {!hasRendered && !hasCaptionText && !isEdited && (
          <div className="absolute top-2 right-2">
            <span className={`badge text-[10px] ${asset.type === 'video' ? 'badge-red' : 'badge-violet'}`}>{asset.type}</span>
          </div>
        )}

        {isDownloading && hasTikTokCaption && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg z-10">
            <Loader className="w-6 h-6 border-2 border-white/30 border-t-transparent rounded-full animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mt-3">
        <p className="text-sm font-medium text-white truncate flex-1">{asset.name}</p>
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="btn-icon text-xs" title="Edit">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onCaption(); }}
            className={`btn-icon text-xs ${hasRendered ? 'text-green-400' : hasCaptionText ? 'text-violet-400' : ''}`}
            title="Add caption overlay"
          >
            <Type className="w-3.5 h-3.5" />
          </button>
          {onDownload && (
            <button
              onClick={(e) => { e.stopPropagation(); onDownload(); }}
              disabled={isDownloading}
              className="btn-icon text-xs hover:text-violet-400 disabled:opacity-50"
              title="Download with overlay"
            >
              {!isDownloading && <Layers className="w-3.5 h-3.5" />}
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="btn-icon text-xs hover:text-red-400" title="Remove">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main StagingView ─────────────────────────────────────────────────────────

export default function StagingView() {
  const {
    stagedAssets,
    clearStaging,
    skipStagedAsset,
    updateStagedAssetEdit,
    updateStagedAssetRenderedUrl,
    updateStagedAssetCaptionText,
    setWorkflowStep,
    postReferences,
  } = useStore();

  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [captionPanelAssetId, setCaptionPanelAssetId] = useState<string | null>(null);
  const [fleetMode, setFleetMode] = useState(false);
  const [tiktokDownloading, setTiktokDownloading] = useState<Set<string>>(new Set());

  const activeAssets = useMemo(() => stagedAssets.filter((sa) => !sa.skipped), [stagedAssets]);
  const selectedCount = selectedAssetIds.size;
  const allSelected = activeAssets.length > 0 && selectedCount === activeAssets.length;

  const toggleSelectAsset = useCallback((assetId: string) => {
    setSelectedAssetIds((prev) => {
      const next = new Set(prev);
      next.has(assetId) ? next.delete(assetId) : next.add(assetId);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedAssetIds(allSelected ? new Set() : new Set(activeAssets.map((sa) => sa.asset.id)));
  }, [allSelected, activeAssets]);

  const handleEditSave = useCallback((result: ImageEditorResult) => {
    if (!editingAssetId) return;
    updateStagedAssetEdit(editingAssetId, result);
    setEditingAssetId(null);
  }, [editingAssetId, updateStagedAssetEdit]);

  const handleTikTokDownload = useCallback(async (assetId: string) => {
    setTiktokDownloading((prev) => new Set(prev).add(assetId));
    try {
      const sa = stagedAssets.find((s) => s.asset.id === assetId);
      if (!sa?.editResult?.overlays?.[0]?.content) {
        alert('No caption text to overlay. Edit this asset first.');
        return;
      }
      const captionText = sa.editResult.overlays[0].content;
      const renderedUrl = await renderTikTokTextOverlay({
        imageUrl: sa.asset.fileUrl,
        text: captionText,
        style: { ...TIKTOK_TEXT_PRESETS.classic },
        quality: 0.92,
      });
      const link = document.createElement('a');
      link.href = renderedUrl;
      link.download = `tiktok-slide-${assetId}.jpg`;
      link.click();
    } catch (err) {
      console.error('Download failed:', err);
      alert('Failed to download image');
    } finally {
      setTiktokDownloading((prev) => { const next = new Set(prev); next.delete(assetId); return next; });
    }
  }, [stagedAssets]);

  const handleRemove = useCallback((assetId: string) => {
    skipStagedAsset(assetId);
    setSelectedAssetIds((prev) => { const next = new Set(prev); next.delete(assetId); return next; });
  }, [skipStagedAsset]);

  const editingAsset = editingAssetId ? activeAssets.find((sa) => sa.asset.id === editingAssetId) : null;
  const captionPanelAsset = captionPanelAssetId ? activeAssets.find((sa) => sa.asset.id === captionPanelAssetId) : null;
  const assetHasLegacyCaption = (assetId: string) => !!activeAssets.find((s) => s.asset.id === assetId)?.editResult?.overlays?.[0]?.content;

  if (fleetMode) {
    return (
      <FleetBuilder
        onClose={() => setFleetMode(false)}
        onDone={() => { setFleetMode(false); clearStaging(); setWorkflowStep('gallery'); }}
      />
    );
  }

  return (
    <>
      {editingAsset && (
        <ImageEditor
          item={{ id: editingAsset.asset.id, url: editingAsset.asset.fileUrl, name: editingAsset.asset.fileName, type: editingAsset.asset.fileType }}
          initialFilters={editingAsset.editResult?.filters}
          initialOverlays={editingAsset.editResult?.overlays}
          onDone={handleEditSave}
          onCancel={() => setEditingAssetId(null)}
        />
      )}

      {captionPanelAsset && (
        <CaptionPanel
          assetId={captionPanelAsset.asset.id}
          assetUrl={captionPanelAsset.asset.fileUrl}
          assetType={captionPanelAsset.asset.fileType}
          renderedUrl={captionPanelAsset.renderedUrl}
          captionText={captionPanelAsset.captionText}
          postReferences={postReferences}
          onClose={() => setCaptionPanelAssetId(null)}
          onRendered={(dataUrl, text) => {
            updateStagedAssetRenderedUrl(captionPanelAsset.asset.id, dataUrl);
            updateStagedAssetCaptionText(captionPanelAsset.asset.id, text);
            setCaptionPanelAssetId(null);
          }}
          onCaptionSaved={(text) => {
            updateStagedAssetCaptionText(captionPanelAsset.asset.id, text);
          }}
        />
      )}

      <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--bg-app)' }}>
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b" style={{ background: 'var(--bg-sidebar)', borderColor: 'rgba(255,255,255,0.06)' }}>
          <button onClick={clearStaging} className="btn-ghost flex items-center gap-2 text-sm">
            <ChevronLeft className="w-4 h-4" />
            Back to Gallery
          </button>
          <div className="text-center">
            <h2 className="text-base font-bold text-white">Edit & Schedule</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {activeAssets.length} asset{activeAssets.length !== 1 ? 's' : ''} ready
            </p>
          </div>
          <button onClick={toggleSelectAll} className="btn-ghost text-xs flex items-center gap-1.5">
            {allSelected ? <><X className="w-3.5 h-3.5" />Deselect All</> : <><Check className="w-3.5 h-3.5" />Select All</>}
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
          {activeAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: 'var(--text-muted)' }}>
              <Layers className="w-10 h-10 opacity-40" />
              <p className="text-sm">No assets in staging.</p>
              <button onClick={clearStaging} className="btn-secondary text-sm mt-2">Back to Gallery</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {activeAssets.map((sa) => (
                <AssetCard
                  key={sa.asset.id}
                  asset={{
                    id: sa.asset.id,
                    url: sa.renderedUrl ?? sa.asset.fileUrl,
                    name: sa.asset.fileName,
                    type: sa.asset.fileType,
                  }}
                  isEdited={!!sa.editResult}
                  isDownloading={tiktokDownloading.has(sa.asset.id)}
                  hasTikTokCaption={assetHasLegacyCaption(sa.asset.id)}
                  hasRendered={!!sa.renderedUrl}
                  hasCaptionText={!!sa.captionText}
                  isSelected={selectedAssetIds.has(sa.asset.id)}
                  onSelect={() => toggleSelectAsset(sa.asset.id)}
                  onEdit={() => setEditingAssetId(sa.asset.id)}
                  onRemove={() => handleRemove(sa.asset.id)}
                  onCaption={() => setCaptionPanelAssetId(sa.asset.id)}
                  onDownload={() => handleTikTokDownload(sa.asset.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-t" style={{ background: 'var(--bg-sidebar)', borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3">
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {selectedCount} of {activeAssets.length} selected
            </span>
            {selectedCount > 0 && (
              <button onClick={() => setSelectedAssetIds(new Set())} className="text-xs hover:text-red-400 transition-colors" style={{ color: 'var(--text-muted)' }}>
                Clear
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeAssets.length >= 2 && (
              <button
                onClick={() => setFleetMode(true)}
                className="btn-secondary flex items-center gap-2 text-sm"
                title="Create a fleet of posts from multiple assets and captions"
              >
                <Rocket className="w-4 h-4" />
                Fleet Mode
              </button>
            )}
            <button
              onClick={() => setWorkflowStep('scheduling')}
              disabled={selectedCount === 0}
              className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Schedule{selectedCount > 0 ? ` ${selectedCount}` : ''}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
