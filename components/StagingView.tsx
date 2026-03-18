'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  ChevronLeft, Film, Image as ImageIcon, X, Pencil, Calendar, Check, Loader,
  Sparkles, MoreVertical, Eye, Layers, Type,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import ImageEditor, { EditableImage, ImageEditorResult } from '@/components/ImageEditor';
import { renderTikTokTextOverlay, TIKTOK_TEXT_PRESETS } from '@/lib/utils/slideshowRenderer';

// ─── Asset Card Component ─────────────────────────────────────────────────

interface AssetCardProps {
  asset: EditableImage;
  isEdited: boolean;
  isDownloading: boolean;
  hasTikTokCaption: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onDownload?: () => void;
}

function AssetCard({
  asset,
  isEdited,
  isSelected,
  isDownloading,
  hasTikTokCaption,
  onSelect,
  onEdit,
  onRemove,
  onDownload,
}: AssetCardProps) {
  return (
    <div
      onClick={onSelect}
      className={`card cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-violet-500' : ''
      }`}
    >
      {/* Thumbnail with edit indicator */}
      <div className="relative w-full aspect-square rounded-lg overflow-hidden">
        {asset.type === 'image' && asset.url ? (
          <img src={asset.url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--bg-elevated)' }}>
            <Film className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
          </div>
        )}

        {/* TikTok caption indicator */}
        {hasTikTokCaption && (
          <div className="absolute top-2 right-2 bg-gradient-to-br from-[#FF0050] to-[#00F2EA] text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
            <Type className="w-3 h-3" />
            Has Caption
          </div>
        )}

        {/* Edit indicator badge */}
        {isEdited && (
          <div className="absolute top-2 left-2 bg-violet-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Edited
          </div>
        )}

        {/* Download spinner for TikTok */}
        {isDownloading && hasTikTokCaption && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg z-10">
            <Loader className="w-6 h-6 border-2 border-white/30 border-t-transparent rounded-full animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        )}

        {/* Asset type badge */}
        <div className="absolute top-2 right-2">
          <span className={`badge text-[10px] ${asset.type === 'video' ? 'badge-red' : 'badge-violet'}`}>
            {asset.type}
          </span>
        </div>
      </div>

      {/* Actions row */}
      <div className="flex items-center gap-2 mt-3">
        <p className="text-sm font-medium text-white truncate flex-1">{asset.name}</p>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="btn-icon text-xs"
            title="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {onDownload && (
            <button
              onClick={(e) => { e.stopPropagation(); onDownload(); }}
              disabled={isDownloading}
              className="btn-icon text-xs hover:text-violet-400 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Download TikTok with text overlay"
            >
              {isDownloading ? (
                <div className="w-4 h-4" />
              ) : (
                <Layers className="w-3.5 h-3.5" />
              )}
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="btn-icon text-xs hover:text-red-400"
            title="Remove"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main StagingView Component ───────────────────────────────────────

export default function StagingView() {
  const {
    stagedAssets,
    clearStaging,
    skipStagedAsset,
    updateStagedAssetEdit,
    setWorkflowStep,
  } = useStore();

  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [tiktokDownloading, setTiktokDownloading] = useState<Set<string>>(new Set());

  const activeAssets = useMemo(
    () => stagedAssets.filter((sa) => !sa.skipped),
    [stagedAssets]
  );

  const selectedCount = selectedAssetIds.size;
  const allSelected = selectedCount === activeAssets.length;

  // Toggle asset selection
  const toggleSelectAsset = useCallback((assetId: string) => {
    setSelectedAssetIds((prev) => {
      const next = new Set(prev);
      if (next.has(assetId)) {
        next.delete(assetId);
      } else {
        next.add(assetId);
      }
      return next;
    });
  }, [activeAssets]);

  // Toggle select all
  const toggleSelectAll = useCallback(() => {
    setSelectedAssetIds((prev) => {
      if (prev.size === activeAssets.length) {
        return new Set(); // Deselect all
      }
      return new Set(activeAssets.map((sa) => sa.asset.id)); // Select all
    });
  }, [activeAssets]);

  // Handle edit save
  const handleEditSave = useCallback((result: ImageEditorResult) => {
    if (!editingAssetId) return;
    updateStagedAssetEdit(editingAssetId, result);
    setEditingAssetId(null);
  }, [editingAssetId, updateStagedAssetEdit]);

  // Handle TikTok download (for VA use)
  const handleTikTokDownload = useCallback(async (assetId: string) => {
    setTiktokDownloading((prev) => new Set(prev).add(assetId));

    try {
      const sa = stagedAssets.find((s) => s.asset.id === assetId);
      if (!sa?.editResult?.overlays?.[0]?.content) {
        alert('No caption text to overlay. Please edit this asset first.');
        return;
      }

      const captionText = sa.editResult.overlays[0].content;

      const renderedUrl = await renderTikTokTextOverlay({
        imageUrl: sa.asset.fileUrl,
        text: captionText,
        style: sa.editResult?.filters ? {
          fontFamily: 'SF-Pro-Display-Bold' as any,
          fontSize: 32,
          color: '#FFFFFF',
          fontWeight: '700' as any,
          lineHeight: 1.2,
          letterSpacing: 0,
          textAlign: 'center',
          position: 'center',
          shadow: {
            enabled: true,
            blur: 8,
            offsetX: 0,
            offsetY: 2,
            color: 'rgba(0,0,0,0.7)',
          },
          padding: {
            enabled: true,
            topBottom: 8,
            leftRight: 16,
          },
        } : { ...TIKTOK_TEXT_PRESETS.classic },
        quality: 0.92,
      });

      // Trigger browser download
      const link = document.createElement('a');
      link.href = renderedUrl;
      link.download = `tiktok-slide-${assetId}.jpg`;
      link.click();
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download image');
    } finally {
      setTiktokDownloading((prev) => {
        const next = new Set(prev);
        next.delete(assetId);
        return next;
      });
    }
  }, [stagedAssets]);

  // Remove asset from staging
  const handleRemove = useCallback((assetId: string) => {
    skipStagedAsset(assetId);
    setSelectedAssetIds((prev) => {
      const next = new Set(prev);
      next.delete(assetId);
      return next;
    });
  }, [skipStagedAsset]);

  // Find editing asset
  const editingAsset = editingAssetId
    ? activeAssets.find((sa) => sa.asset.id === editingAssetId)
    : null;

  // Determine if asset has TikTok caption
  const assetHasCaption = (assetId: string) => {
    const sa = activeAssets.find((s) => s.asset.id === assetId);
    return !!sa?.editResult?.overlays?.[0]?.content;
  };

  return (
    <>
      {/* Image Editor Modal */}
      {editingAsset && (
        <ImageEditor
          item={{
            id: editingAsset.asset.id,
            url: editingAsset.asset.fileUrl,
            name: editingAsset.asset.fileName,
            type: editingAsset.asset.fileType,
          }}
          initialFilters={editingAsset.editResult?.filters}
          initialOverlays={editingAsset.editResult?.overlays}
          onDone={handleEditSave}
          onCancel={() => setEditingAssetId(null)}
        />
      )}

      {/* Main Staging View */}
      <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--bg-app)' }}>
        {/* Header */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b"
          style={{ background: 'var(--bg-sidebar)', borderColor: 'rgba(255,255,255,0.06)' }}
        >
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
          <button
            onClick={toggleSelectAll}
            className="btn-ghost text-xs flex items-center gap-1.5"
          >
            {allSelected ? (
              <>
                <X className="w-3.5 h-3.5" />
                Deselect All
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                Select All
              </>
            )}
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
          {activeAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: 'var(--text-muted)' }}>
              <Layers className="w-10 h-10 opacity-40" />
              <p className="text-sm">No assets in staging.</p>
              <button onClick={clearStaging} className="btn-secondary text-sm mt-2">
                Back to Gallery
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {activeAssets.map((sa) => {
                const isSelected = selectedAssetIds.has(sa.asset.id);
                const isDownloading = tiktokDownloading.has(sa.asset.id);
                const hasTikTokCaption = assetHasCaption(sa.asset.id);
                return (
                  <AssetCard
                    key={sa.asset.id}
                    asset={{
                      id: sa.asset.id,
                      url: sa.asset.fileUrl,
                      name: sa.asset.fileName,
                      type: sa.asset.fileType,
                    }}
                    isEdited={!!sa.editResult}
                    isDownloading={isDownloading}
                    hasTikTokCaption={hasTikTokCaption}
                    isSelected={isSelected}
                    onSelect={() => toggleSelectAsset(sa.asset.id)}
                    onEdit={() => setEditingAssetId(sa.asset.id)}
                    onRemove={() => handleRemove(sa.asset.id)}
                    onDownload={() => handleTikTokDownload(sa.asset.id)}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-t"
          style={{ background: 'var(--bg-sidebar)', borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-3">
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {selectedCount} of {activeAssets.length} selected
            </span>
            {selectedCount > 0 && (
              <button
                onClick={() => setSelectedAssetIds(new Set())}
                className="text-xs hover:text-red-400 transition-colors"
              >
                Clear selection
              </button>
            )}
          </div>
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
    </>
  );
}
