// ─── Utility and Helper Types ─────────────────────────────────────────────────────────

// ─── Image Processing ─────────────────────────────────────────────────────────

export interface InstagramFilter {
  name: string;
  css: string;
}

export interface EXIFPreset {
  device: string;
  model: string;
  lens: string;
  software: string;
  gpsLatitude: number;
  gpsLongitude: number;
  isoVariance: number[];
  focalLengthVariance: number[];
}

// ─── Aspect Ratio Checking ─────────────────────────────────────────────────────────

export interface ARViolation {
  fileName: string;
  width: number;
  height: number;
  actualRatio: number;
  displayRatio: string;
}

export interface ARCheckResult {
  valid: boolean;
  violations: ARViolation[];
}

// ─── Carousel Analysis ─────────────────────────────────────────────────────────

export interface CarouselAnalysis {
  overallScore: number; // 0-100
  imageScores: ImageScore[];
  recommendedOrder: number[]; // indices of assets in recommended order
  reasoning: string;
}

export interface ImageScore {
  index: number;
  score: number; // 0-100
  strengths: string[];
  weaknesses: string[];
  hookPotential: number; // 0-100 (how good as first image)
  viralFactors: {
    composition: number;
    colorAppeal: number;
    subjectClarity: number;
    emotionalImpact: number;
    curiosityGap: number;
  };
}

// ─── Auto Scheduler ─────────────────────────────────────────────────────────

import { Platform } from './models';
import { Model, Post, Asset } from './models';

export interface AutoScheduleConfig {
  modelId: string;
  model: Model;
  daysToGenerate: number; // 1-7 days
  assetsPool: Asset[]; // Available assets to schedule
  existingPosts: Post[]; // Already scheduled posts to avoid conflicts
  preferences?: {
    preferredTimes?: string[]; // e.g., ["09:00", "13:00", "21:00"]
    platformPriority?: Platform[]; // Which platforms to prioritize
    minPostsPerDay?: number;
    maxPostsPerDay?: number;
    avoidWeekends?: boolean;
  };
}

export interface AutoScheduleResult {
  generatedPosts: Post[];
  summary: {
    totalPosts: number;
    byPlatform: Record<Platform, number>;
    byDay: Record<string, number>;
  };
  reasoning: string;
  requiresApproval: boolean;
}

// ─── Image Editor ─────────────────────────────────────────────────────────

export interface FilterState {
  namedFilter: string;
  filters: Record<string, number>;
}

export interface OverlayItem {
  type: 'text' | 'emoji' | 'image';
  content: string;
  position: { x: number; y: number };
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  rotation?: number;
}

export interface EditableImage {
  originalUrl: string;
  currentUrl: string;
  width: number;
  height: number;
  filterState?: FilterState;
  overlays?: OverlayItem[];
  crop?: { x: number; y: number; width: number; height: number };
}

export interface ImageEditorResult {
  url: string;
  filters: Record<string, number>;
  overlays: OverlayItem[];
  crop?: { x: number; y: number; width: number; height: number };
}

export type EditorTool = 'filters' | 'crop' | 'adjust' | 'text' | 'emoji';
export type LocalCropRatio = 'free' | '1:1' | '4:5' | '9:16' | '16:9';

// ─── Create Post Modal ─────────────────────────────────────────────────────────

export type PostFormat = 'carousel' | 'reels' | 'threads' | 'story' | 'x';

export interface MediaItem {
  id: string;
  url: string;
  name: string;
  type: 'image' | 'video';
  file?: File;
  width?: number;
  height?: number;
  duration?: number; // for videos
  filters?: {
    namedFilter: string;
    brightness: number;
    contrast: number;
    saturation: number;
    warmth: number;
    vignette: number;
    fade: number;
    sharpen: number;
  };
  overlays?: {
    id: string;
    type: 'text' | 'emoji';
    content: string;
    x: number;
    y: number;
    fontSize: number;
    color: string;
    bold: boolean;
    shadow: boolean;
    align: 'left' | 'center' | 'right';
    fontFamily: string;
  }[];
}

// ─── Component Props Types ─────────────────────────────────────────────────────────

export type ActivePage = 'calendar' | 'captions' | 'va' | 'models' | 'gallery' | 'analytics' | 'settings' | 'research';
export type CalendarViewType = 'day' | 'week' | 'month';
