// Shared constants for NativeEditor and per-platform caption styling in CreatePostModal

export type FontKey  = 'classic' | 'modern' | 'neon' | 'typewriter' | 'strong';
export type StrokeKey = 'none' | 'light' | 'bold' | 'white';
export type CropRatio = 'original' | '1:1' | '4:5' | '9:16';

export interface FontConfig {
  label: string;
  family: string;
  weight: number;
  extraStyle?: React.CSSProperties;
}

export const EDITOR_FONTS: Record<FontKey, FontConfig> = {
  classic:    { label: 'Classic',    family: '-apple-system, Helvetica Neue, Arial, sans-serif', weight: 600 },
  modern:     { label: 'Modern',     family: 'Georgia, "Times New Roman", serif',                weight: 600 },
  neon:       { label: 'Neon',       family: 'Helvetica Neue, Arial, sans-serif',                weight: 700,
                extraStyle: { letterSpacing: '0.04em' } },
  typewriter: { label: 'Writer',     family: '"Courier New", Courier, monospace',               weight: 500 },
  strong:     { label: 'Strong',     family: 'Impact, "Arial Black", Haettenschweiler, sans-serif', weight: 900,
                extraStyle: { letterSpacing: '0.02em' } },
};

export interface StrokeConfig { label: string; preview: string }

export const EDITOR_STROKES: Record<StrokeKey, StrokeConfig> = {
  none:  { label: 'None',  preview: '1px 1px 3px rgba(0,0,0,0.5)' },
  light: { label: 'Light', preview: '-1px -1px 0 rgba(0,0,0,0.7), 1px 1px 0 rgba(0,0,0,0.7)' },
  bold:  { label: 'Bold',  preview: '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000' },
  white: { label: 'White', preview: '-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff' },
};

export function getTextShadow(fontKey: FontKey, stroke: StrokeKey, color: string): string {
  if (fontKey === 'neon') {
    return `0 0 8px ${color}, 0 0 24px ${color}, 0 0 40px ${color}`;
  }
  return EDITOR_STROKES[stroke].preview;
}

export const EDITOR_COLORS = [
  '#FFFFFF', '#000000', '#FFD700', '#FF6B6B',
  '#4ECDC4', '#A78BFA', '#F472B6', '#34D399',
];

// Warm gradient swatch used for filter previews (always loads, clearly shows filter effect)
export const FILTER_SWATCH = 'linear-gradient(160deg, #FDE68A 0%, #FBBF24 20%, #F97316 40%, #EC4899 65%, #A855F7 85%, #6366F1 100%)';

export const FILTERS: { label: string; value: string }[] = [
  { label: 'Normal',    value: 'none' },
  { label: 'Clarendon', value: 'contrast(1.2) saturate(1.35)' },
  { label: 'Gingham',   value: 'brightness(1.05) hue-rotate(-10deg) saturate(0.9)' },
  { label: 'Moon',      value: 'grayscale(1) contrast(1.1) brightness(1.1)' },
  { label: 'Lark',      value: 'contrast(0.9) brightness(1.1) saturate(1.25)' },
  { label: 'Reyes',     value: 'sepia(0.22) contrast(0.85) brightness(1.1) saturate(0.75)' },
  { label: 'Juno',      value: 'saturate(1.4) contrast(1.1)' },
  { label: 'Slumber',   value: 'saturate(0.66) brightness(1.05) sepia(0.1)' },
  { label: 'Crema',     value: 'contrast(1.04) saturate(0.73) sepia(0.1)' },
  { label: 'Ludwig',    value: 'sepia(0.25) saturate(1.4) brightness(1.1)' },
  { label: 'Aden',      value: 'hue-rotate(-20deg) contrast(0.9) saturate(0.85) brightness(1.2)' },
  { label: 'Inkwell',   value: 'grayscale(1) sepia(0.1) contrast(1.1)' },
  { label: 'Nashville', value: 'sepia(0.2) contrast(1.2) brightness(1.05) saturate(1.2)' },
  { label: 'Valencia',  value: 'contrast(1.08) brightness(1.08) sepia(0.15)' },
];
