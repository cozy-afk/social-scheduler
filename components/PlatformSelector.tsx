'use client';

import { memo } from 'react';
import { Check } from 'lucide-react';
import { Platform } from '@/types/models';
import { getPlatformTheme } from '@/lib/constants/platform';
import { InstagramIcon, TikTokIcon, XIcon, ThreadsIcon, FanvueIcon } from './PlatformIcons';

interface PlatformSelectorProps {
  selectedPlatforms: Platform[];
  onToggle: (platform: Platform) => void;
  showPresets?: boolean;
  onApplyPreset?: (platforms: Platform[]) => void;
}

const PLATFORM_ICONS: Record<Platform, React.ReactNode> = {
  instagram: <InstagramIcon size={14} />,
  tiktok: <TikTokIcon size={14} />,
  x: <XIcon size={14} />,
  threads: <ThreadsIcon size={14} />,
  fanvue: <FanvueIcon size={14} />,
};

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
            <span>{PLATFORM_ICONS[p]}</span>
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
