'use client';

import { memo } from 'react';
import { Check } from 'lucide-react';
import { Platform } from '@/types/models';
import { getPlatformTheme } from '@/lib/constants/platform';

interface PlatformSelectorProps {
  selectedPlatforms: Platform[];
  onToggle: (platform: Platform) => void;
  showPresets?: boolean;
  onApplyPreset?: (platforms: Platform[]) => void;
}

export const PlatformSelector = memo(function PlatformSelector({
  selectedPlatforms,
  onToggle,
  showPresets = false,
  onApplyPreset,
}: PlatformSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {(['instagram', 'tiktok', 'x', 'threads', 'fanvue'] as Platform[]).map((p) => {
        const theme = getPlatformTheme(p);
        const isSelected = selectedPlatforms.includes(p);
        return (
          <button
            key={p}
            type="button"
            onClick={() => onToggle(p)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
              isSelected ? theme.active : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:border-slate-600'
            }`}
          >
            {isSelected && <Check className="w-3 h-3" />}
            <span>{theme.icon}</span>
            {theme.label}
          </button>
        );
      })}

      {showPresets && onApplyPreset && (
        <button
          type="button"
          onClick={() => onApplyPreset(selectedPlatforms)}
          className="px-3 py-1.5 rounded-xl border border-dashed border-slate-600 text-xs text-slate-500 hover:border-slate-400 hover:text-slate-300 transition-all"
        >
          Presets
        </button>
      )}
    </div>
  );
});
