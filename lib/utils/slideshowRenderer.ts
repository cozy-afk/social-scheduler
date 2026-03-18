/**
 * TikTok Slideshow Text Renderer
 *
 * Renders native-looking TikTok text overlays on images.
 * Uses system fonts and TikTok's characteristic styling.
 */

import { CaptionStyle, TikTokFontFamily, TikTokTextPosition } from '@/types/models';
import { ImageEditorResult } from '@/types/utils';

// ─── Font Loading ─────────────────────────────────────────────────────────────

const TIKTOK_FONTS: Record<TikTokFontFamily, string[]> = [
  'SF-Pro-Display-Bold',
  'SF-Pro-Text-Semibold',
  'SF-Pro-Text-Regular',
  'Roboto-Bold',
  'Roboto-Medium',
  'Roboto-Regular',
].reduce((acc, font) => {
  acc[font as TikTokFontFamily] = [font, 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'];
  return acc;
}, {} as Record<TikTokFontFamily, string[]>);

// ─── TikTok Native Color Palette ───────────────────────────────────────────────

const TIKTOK_COLORS = {
  pureWhite: '#FFFFFF',
  offWhite: '#F8F8F8',
  pureBlack: '#000000',
  textShadowBlack: 'rgba(0, 0, 0, 0.7)',
  textShadowLight: 'rgba(0, 0, 0, 0.3)',
  accentPink: '#FE2C55',
  accentCyan: '#25F4EE',
};

// ─── Position Calculations ─────────────────────────────────────────────────────

function getPositionCoordinates(
  position: TikTokTextPosition,
  customPosition?: { x: number; y: number }
): { x: number; y: number; align: CanvasTextAlign; baseline: CanvasTextBaseline } {
  switch (position) {
    case 'top':
      return { x: 0.5, y: 0.15, align: 'center', baseline: 'top' };
    case 'top-left':
      return { x: 0.08, y: 0.15, align: 'left', baseline: 'top' };
    case 'top-right':
      return { x: 0.92, y: 0.15, align: 'right', baseline: 'top' };
    case 'center':
    case 'center-left':
      return { x: 0.5, y: 0.5, align: 'center', baseline: 'middle' };
    case 'center-right':
      return { x: 0.92, y: 0.5, align: 'right', baseline: 'middle' };
    case 'bottom':
      return { x: 0.5, y: 0.82, align: 'center', baseline: 'bottom' };
    case 'bottom-left':
      return { x: 0.08, y: 0.82, align: 'left', baseline: 'bottom' };
    case 'bottom-right':
      return { x: 0.92, y: 0.82, align: 'right', baseline: 'bottom' };
    case 'custom':
      if (customPosition) {
        return {
          x: customPosition.x / 100,
          y: customPosition.y / 100,
          align: 'center',
          baseline: 'middle',
        };
      }
      return { x: 0.5, y: 0.5, align: 'center', baseline: 'middle' };
    default:
      return { x: 0.5, y: 0.5, align: 'center', baseline: 'middle' };
  }
}

// ─── Text Wrapping ─────────────────────────────────────────────────────────────

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  lineHeight: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

// ─── Get Font Size Scaled to Image ───────────────────────────────────────────

function getScaledFontSize(
  baseFontSize: number,
  imageWidth: number,
  referenceWidth: number = 1080
): number {
  // TikTok's reference width is 1080px (standard mobile width)
  // Scale font proportionally to actual image size
  return (baseFontSize * imageWidth) / referenceWidth;
}

// ─── Render Text Background (if enabled) ───────────────────────────────────

function renderTextBackground(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  style: CaptionStyle
): void {
  if (!style.background?.enabled) return;

  const radius = style.background.borderRadius;
  const color = style.background.color;

  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x - width / 2, y - height / 2, width, height, radius);
  ctx.fill();
  ctx.restore();
}

// ─── Render Text with Native TikTok Styling ───────────────────────────────

function renderTikTokText(
  ctx: CanvasRenderingContext2D,
  text: string,
  style: CaptionStyle,
  imageWidth: number,
  imageHeight: number
): void {
  const fontSize = getScaledFontSize(style.fontSize, imageWidth);
  const lineHeight = style.lineHeight;
  const scaledLetterSpacing = (style.letterSpacing * imageWidth) / 1080;

  // Set font with proper TikTok font stack
  const fontStack = TIKTOK_FONTS[style.fontFamily] || TIKTOK_FONTS['SF-Pro-Display-Bold'];
  ctx.font = `${style.fontWeight} ${fontSize}px ${fontStack.join(', ')}`;
  ctx.textAlign = style.textAlign;
  ctx.textBaseline = 'middle';

  // Calculate position
  const pos = getPositionCoordinates(style.position, style.customPosition);
  const x = pos.x * imageWidth;
  const y = pos.y * imageHeight;
  const maxTextWidth = imageWidth * 0.72; // 72% — keeps text off edges on mobile (safe-zone)

  // Wrap text to fit
  const lines = wrapText(ctx, text, maxTextWidth, fontSize * lineHeight);
  const totalHeight = lines.length * fontSize * lineHeight;

  // Calculate dimensions for background
  let maxWidth = 0;
  for (const line of lines) {
    const metrics = ctx.measureText(line);
    if (metrics.width > maxWidth) maxWidth = metrics.width;
  }

  // Add padding if enabled
  const paddingTopBottom = style.padding.enabled ? (style.padding.topBottom * imageWidth) / 1080 : 0;
  const paddingLeftRight = style.padding.enabled ? (style.padding.leftRight * imageWidth) / 1080 : 0;

  const bgWidth = maxWidth + paddingLeftRight * 2;
  const bgHeight = totalHeight + paddingTopBottom * 2;

  // Render background (before text)
  if (style.background?.enabled) {
    renderTextBackground(ctx, x, y, bgWidth, bgHeight, style);
  }

  // Set text color
  ctx.fillStyle = style.color;

  // Set shadow (TikTok's characteristic text shadow)
  if (style.shadow.enabled) {
    const blurRadius = (style.shadow.blur * imageWidth) / 1080;
    const offsetX = (style.shadow.offsetX * imageWidth) / 1080;
    const offsetY = (style.shadow.offsetY * imageWidth) / 1080;

    // Layered shadow for depth (TikTok style)
    ctx.shadowColor = style.shadow.color;
    ctx.shadowBlur = blurRadius;
    ctx.shadowOffsetX = offsetX;
    ctx.shadowOffsetY = offsetY;
  } else {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  // Render each line
  const startY = y - (totalHeight / 2) + (fontSize * lineHeight / 2);

  for (let i = 0; i < lines.length; i++) {
    const lineY = startY + i * fontSize * lineHeight;
    ctx.fillText(lines[i], x, lineY);
  }

  // Reset shadow for next operations
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

// ─── Main Render Function ───────────────────────────────────────────────────

export interface TikTokRenderOptions {
  imageUrl: string;
  text: string;
  style: CaptionStyle;
  quality?: number; // 0.1 to 1.0, default 0.92
  maxWidth?: number; // Resize image if larger (default 1080)
}

/**
 * Renders a TikTok-style text overlay on an image.
 *
 * @param options - Rendering configuration
 * @returns Promise resolving to data URL of rendered image
 */
export async function renderTikTokTextOverlay(
  options: TikTokRenderOptions
): Promise<string> {
  const { imageUrl, text, style, quality = 0.92, maxWidth = 1080 } = options;

  // Load the image
  const img = new Image();
  img.crossOrigin = 'anonymous';

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });

  // Determine output dimensions (scale down if too large)
  let outputWidth = img.naturalWidth;
  let outputHeight = img.naturalHeight;

  if (outputWidth > maxWidth) {
    const scale = maxWidth / outputWidth;
    outputWidth = maxWidth;
    outputHeight = outputHeight * scale;
  }

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext('2d')!;

  // Draw image
  ctx.drawImage(img, 0, 0, outputWidth, outputHeight);

  // Render text overlay
  if (text.trim()) {
    renderTikTokText(ctx, text, style, outputWidth, outputHeight);
  }

  // Return data URL
  return canvas.toDataURL('image/jpeg', quality);
}

// ─── Batch Render for Slideshows ─────────────────────────────────────────

export interface TikTokSlideshowConfig {
  slides: Array<{
    imageUrl: string;
    text: string;
    style?: CaptionStyle;
  }>;
  quality?: number;
  maxWidth?: number;
}

export async function renderTikTokSlideshow(
  config: TikTokSlideshowConfig
): Promise<string[]> {
  const results: string[] = [];

  for (const slide of config.slides) {
    const rendered = await renderTikTokTextOverlay({
      imageUrl: slide.imageUrl,
      text: slide.text,
      style: slide.style || { ...TIKTOK_TEXT_PRESETS.classic },
      quality: config.quality,
      maxWidth: config.maxWidth,
    });
    results.push(rendered);
  }

  return results;
}

// ─── Preview Helper (for UI) ───────────────────────────────────────────────

export interface TikTokPreviewConfig {
  imageUrl: string;
  text: string;
  style: CaptionStyle;
}

/**
 * Returns CSS configuration for live preview of TikTok text.
 * Used in UI components for real-time preview without canvas.
 */
export function getTikTokTextPreviewCSS(
  config: TikTokPreviewConfig
): React.CSSProperties {
  const { text, style } = config;
  const fontStack = TIKTOK_FONTS[style.fontFamily] || TIKTOK_FONTS['SF-Pro-Display-Bold'];

  return {
    fontFamily: fontStack.join(', '),
    fontSize: `${style.fontSize}px`,
    fontWeight: style.fontWeight,
    lineHeight: style.lineHeight,
    letterSpacing: `${style.letterSpacing}px`,
    textAlign: style.textAlign,
    color: style.color,
    textShadow: style.shadow.enabled
      ? `${style.shadow.offsetX}px ${style.shadow.offsetY}px ${style.shadow.blur}px ${style.shadow.color}`
      : 'none',
    padding: style.padding.enabled
      ? `${style.padding.topBottom}px ${style.padding.leftRight}px`
      : '0',
    background: style.background?.enabled
      ? style.background.color
      : 'transparent',
    borderRadius: style.background?.enabled
      ? `${style.background.borderRadius}px`
      : '0',
    position: 'absolute',
    wordBreak: 'break-word',
    maxWidth: '85%',
  };
}

// ─── Export Presets for UI ─────────────────────────────────────────────────

export const TIKTOK_TEXT_PRESETS: Record<string, CaptionStyle> = {
  classic: {
    fontFamily: 'SF-Pro-Display-Bold',
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '700',
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
  },
  minimal: {
    fontFamily: 'SF-Pro-Text-Regular',
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '400',
    lineHeight: 1.4,
    letterSpacing: 1,
    textAlign: 'center',
    position: 'bottom',
    shadow: {
      enabled: true,
      blur: 6,
      offsetX: 0,
      offsetY: 1,
      color: 'rgba(0,0,0,0.5)',
    },
    padding: {
      enabled: false,
      topBottom: 0,
      leftRight: 0,
    },
  },
  punchy: {
    fontFamily: 'SF-Pro-Display-Bold',
    fontSize: 40,
    color: '#FFFFFF',
    fontWeight: '700',
    lineHeight: 1.1,
    letterSpacing: 2,
    textAlign: 'center',
    position: 'center',
    shadow: {
      enabled: true,
      blur: 12,
      offsetX: 2,
      offsetY: 4,
      color: 'rgba(0,0,0,0.7)',
    },
    padding: {
      enabled: true,
      topBottom: 12,
      leftRight: 24,
    },
    background: {
      enabled: true,
      color: 'rgba(0,0,0,0.4)',
      borderRadius: 12,
    },
  },
  subtitle: {
    fontFamily: 'SF-Pro-Text-Semibold',
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '500',
    lineHeight: 1.5,
    letterSpacing: 0,
    textAlign: 'center',
    position: 'bottom',
    shadow: {
      enabled: true,
      blur: 4,
      offsetX: 0,
      offsetY: 1,
      color: 'rgba(0,0,0,0.5)',
    },
    padding: {
      enabled: false,
      topBottom: 0,
      leftRight: 0,
    },
  },
};
