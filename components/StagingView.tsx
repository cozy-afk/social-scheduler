'use client';

import { ChevronLeft, ChevronRight, Film, CheckCircle2 } from 'lucide-react';
import { useStore } from '@/lib/store';
import { CropRatio, GalleryAsset, StagedAsset, StagedVariant } from '@/types/models';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StagingViewProps {
  onEditVariant: (assetId: string, ratio: CropRatio) => void;
}

// ─── CropPreviewCard ──────────────────────────────────────────────────────────

interface CropPreviewCardProps {
  asset: GalleryAsset;
  ratio: CropRatio;
  variant: StagedVariant;
  onEdit: () => void;
}

function CropPreviewCard({ asset, ratio, variant, onEdit }: CropPreviewCardProps) {
  const [w, h] =
    ratio === '1:1' ? [1, 1] : ratio === '4:5' ? [4, 5] : [9, 16];

  return (
    <div className="flex flex-col gap-2">
      {/* Label row */}
      <div className="flex items-center justify-between min-h-[18px]">
        <span className="text-xs font-medium text-slate-400">{ratio}</span>
        {variant.edited && (
          <span className="flex items-center gap-1 text-[10px] text-green-400">
            <CheckCircle2 className="w-3 h-3" />
            Edited
          </span>
        )}
      </div>

      {/* Preview container */}
      <div
        className="relative rounded-xl overflow-hidden bg-slate-800 border border-slate-700 w-full"
        style={{ aspectRatio: `${w}/${h}` }}
      >
        {asset.fileType === 'image' ? (
          <img
            src={variant.editResult?.url || asset.fileUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="w-8 h-8 text-slate-600" />
          </div>
        )}

        {/* Edited border ring */}
        {variant.edited && (
          <div className="absolute inset-0 border-2 border-green-500/60 rounded-xl pointer-events-none" />
        )}

        {/* Filter badge */}
        {variant.editResult?.namedFilter &&
          variant.editResult.namedFilter !== 'Normal' &&
          variant.editResult.namedFilter !== '' && (
            <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[8px] px-1.5 py-0.5 rounded font-medium">
              {variant.editResult.namedFilter}
            </div>
          )}
      </div>

      {/* Edit / Re-edit button */}
      <button
        onClick={onEdit}
        className={`w-full text-xs py-2 rounded-lg font-medium transition-all ${
          variant.edited
            ? 'btn-secondary border-green-500/30'
            : 'btn-primary'
        }`}
      >
        {variant.edited ? 'Re-edit' : 'Edit'}
      </button>
    </div>
  );
}

// ─── AssetRow ─────────────────────────────────────────────────────────────────

interface AssetRowProps {
  stagedAsset: StagedAsset;
  onEditVariant: (assetId: string, ratio: CropRatio) => void;
  onSkip: (assetId: string) => void;
}

function AssetRow({ stagedAsset, onEditVariant, onSkip }: AssetRowProps) {
  const { asset, variants } = stagedAsset;
  const editedVariants = variants.filter((v) => v.edited).length;

  return (
    <div className="border-b border-slate-800 p-4 sm:p-6 space-y-4">
      {/* Asset header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0 flex items-center justify-center">
            {asset.fileType === 'image' ? (
              <img
                src={asset.thumbnailUrl || asset.fileUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <Film className="w-5 h-5 text-slate-500" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-200 truncate max-w-[200px]">
              {asset.fileName}
            </p>
            <p className="text-xs text-slate-500">
              {editedVariants}/{3} crops edited
            </p>
          </div>
        </div>
        <button
          onClick={() => onSkip(asset.id)}
          className="btn-ghost text-xs text-slate-500 hover:text-red-400"
        >
          Skip
        </button>
      </div>

      {/* Crop preview cards */}
      <div className="grid grid-cols-3 gap-3">
        {(['1:1', '4:5', '9:16'] as CropRatio[]).map((ratio) => {
          const variant = variants.find((v) => v.ratio === ratio)!;
          return (
            <CropPreviewCard
              key={ratio}
              asset={asset}
              ratio={ratio}
              variant={variant}
              onEdit={() => onEditVariant(asset.id, ratio)}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── StagingView ──────────────────────────────────────────────────────────────

export default function StagingView({ onEditVariant }: StagingViewProps) {
  const { stagedAssets, clearStaging, skipStagedAsset, setWorkflowStep } =
    useStore();

  const activeAssets = stagedAssets.filter((sa) => !sa.skipped);

  // Count total edited variants across all active assets
  const editedCount = activeAssets.reduce(
    (sum, sa) => sum + sa.variants.filter((v) => v.edited).length,
    0
  );
  const totalVariants = activeAssets.length * 3;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-10 bg-slate-900 border-b border-slate-700 px-4 sm:px-6 py-4 flex items-center justify-between flex-shrink-0">
        <button
          onClick={() => clearStaging()}
          className="btn-ghost flex items-center gap-2 text-sm"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Gallery
        </button>

        <div className="text-center">
          <h2 className="text-base font-bold text-white">Staging</h2>
          <p className="text-xs text-slate-400">
            {activeAssets.length} asset{activeAssets.length !== 1 ? 's' : ''} ready
          </p>
        </div>

        <div className="text-xs text-slate-500">{editedCount} edited</div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {activeAssets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-500">
            <Film className="w-10 h-10 opacity-40" />
            <p className="text-sm">All assets have been skipped.</p>
            <button
              onClick={() => clearStaging()}
              className="btn-secondary text-sm mt-2"
            >
              Back to Gallery
            </button>
          </div>
        ) : (
          activeAssets.map((sa) => (
            <AssetRow
              key={sa.asset.id}
              stagedAsset={sa}
              onEditVariant={onEditVariant}
              onSkip={skipStagedAsset}
            />
          ))
        )}
      </div>

      {/* ── Sticky footer ── */}
      <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur border-t border-slate-700 p-4 flex items-center justify-between flex-shrink-0">
        <p className="text-xs text-slate-500">
          {editedCount} of {totalVariants} crops edited
        </p>
        <button
          onClick={() => setWorkflowStep('scheduling')}
          disabled={editedCount === 0}
          className="btn-primary flex items-center gap-2 disabled:opacity-40"
        >
          Proceed to Scheduling
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
