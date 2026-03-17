'use client';

import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Film, Image as ImageIcon, X } from 'lucide-react';
import { useStore } from '@/lib/store';
import { CropRatio } from '@/types/models';

export default function StagingView({ onEditVariant: _onEditVariant }: { onEditVariant?: (assetId: string, ratio: CropRatio) => void }) {
  const { stagedAssets, clearStaging, skipStagedAsset, setWorkflowStep } = useStore();

  const activeAssets = useMemo(() => stagedAssets.filter((sa) => !sa.skipped), [stagedAssets]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--bg-app)' }}>
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b"
        style={{ background: 'var(--bg-sidebar)', borderColor: 'rgba(255,255,255,0.06)' }}>
        <button onClick={clearStaging} className="btn-ghost flex items-center gap-2 text-sm">
          <ChevronLeft className="w-4 h-4" />
          Back to Gallery
        </button>
        <div className="text-center">
          <h2 className="text-base font-bold text-white">Review Assets</h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {activeAssets.length} asset{activeAssets.length !== 1 ? 's' : ''} ready to schedule
          </p>
        </div>
        <div className="w-24" />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
        {activeAssets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: 'var(--text-muted)' }}>
            <Film className="w-10 h-10 opacity-40" />
            <p className="text-sm">All assets removed.</p>
            <button onClick={clearStaging} className="btn-secondary text-sm mt-2">Back to Gallery</button>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-2">
            {activeAssets.map((sa) => (
              <div key={sa.asset.id} className="card flex items-center gap-4 p-4">
                <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
                  style={{ background: 'var(--bg-elevated)' }}>
                  {sa.asset.fileType === 'image' && sa.asset.fileUrl ? (
                    <img src={sa.asset.fileUrl} alt="" className="w-full h-full object-cover" />
                  ) : sa.asset.fileType === 'video' ? (
                    <Film className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
                  ) : (
                    <ImageIcon className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{sa.asset.fileName}</p>
                  <span className={`badge text-[10px] mt-1 ${sa.asset.fileType === 'video' ? 'badge-red' : 'badge-violet'}`}>
                    {sa.asset.fileType}
                  </span>
                </div>
                <button onClick={() => skipStagedAsset(sa.asset.id)} className="btn-icon flex-shrink-0 hover:text-red-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-t"
        style={{ background: 'var(--bg-sidebar)', borderColor: 'rgba(255,255,255,0.06)' }}>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {activeAssets.length} asset{activeAssets.length !== 1 ? 's' : ''} selected
        </p>
        <button
          onClick={() => setWorkflowStep('scheduling')}
          disabled={activeAssets.length === 0}
          className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Schedule Assets
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
