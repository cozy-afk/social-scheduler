import { GalleryAsset } from '@/types/models';

/**
 * Virality analysis factors for image scoring
 */
export interface ViralityFactors {
  quality: number; // Image resolution and clarity
  composition: number; // Visual balance and framing
  colorAppeal: number; // Color harmony and vibrancy
  lighting: number; // Proper exposure and lighting
  subjectClarity: number; // Clear, focused subject
  emotionalImpact: number; // Evokes emotion or interest
}

/**
 * Virality analysis result
 */
export interface ViralityAnalysis {
  score: number; // 0-100 overall score
  factors: ViralityFactors;
  strengths: string[];
  improvements: string[];
  rating: 'poor' | 'fair' | 'good' | 'excellent' | 'viral';
}

/**
 * Calculate a simple virality score for an image asset
 * This is a heuristic-based scoring system that can be enhanced with AI vision
 *
 * @param asset - The gallery asset to analyze
 * @returns Virality analysis with score and factors
 */
export async function calculateViralityScore(
  asset: GalleryAsset
): Promise<ViralityAnalysis> {
  // Only analyze images
  if (asset.fileType !== 'image') {
    return {
      score: 0,
      factors: {
        quality: 0,
        composition: 0,
        colorAppeal: 0,
        lighting: 0,
        subjectClarity: 0,
        emotionalImpact: 0,
      },
      strengths: [],
      improvements: [],
      rating: 'poor',
    };
  }

  // Initialize factors with base scores
  const factors: ViralityFactors = {
    quality: calculateQualityScore(asset),
    composition: calculateCompositionScore(asset),
    colorAppeal: 75, // Default - would need AI for actual analysis
    lighting: 75, // Default - would need AI for actual analysis
    subjectClarity: 80, // Default - would need AI for actual analysis
    emotionalImpact: 70, // Default - would need AI for actual analysis
  };

  // Calculate overall score as weighted average
  const weights = {
    quality: 0.15,
    composition: 0.20,
    colorAppeal: 0.20,
    lighting: 0.15,
    subjectClarity: 0.20,
    emotionalImpact: 0.10,
  };

  const score = Math.round(
    factors.quality * weights.quality +
    factors.composition * weights.composition +
    factors.colorAppeal * weights.colorAppeal +
    factors.lighting * weights.lighting +
    factors.subjectClarity * weights.subjectClarity +
    factors.emotionalImpact * weights.emotionalImpact
  );

  // Generate insights based on scores
  const { strengths, improvements } = generateInsights(factors, asset);
  const rating = getRating(score);

  return {
    score,
    factors,
    strengths,
    improvements,
    rating,
  };
}

/**
 * Calculate quality score based on resolution and file size
 */
function calculateQualityScore(asset: GalleryAsset): number {
  if (!asset.width || !asset.height) {
    return 70; // Default if dimensions unknown
  }

  const totalPixels = asset.width * asset.height;

  // Score based on resolution
  let score = 0;
  if (totalPixels >= 4000000) score = 90; // >= 4K (e.g., 2048x2048)
  else if (totalPixels >= 2500000) score = 85; // >= 2.5K
  else if (totalPixels >= 1080000) score = 80; // >= 1080p
  else if (totalPixels >= 720000) score = 70; // >= 720p
  else score = 60; // Lower resolution

  // Bonus for appropriate file size (indicates good compression/quality)
  if (asset.sizeBytes) {
    const fileSizeMB = asset.sizeBytes / (1024 * 1024);
    // For images, 1-5MB is typically good quality
    if (fileSizeMB >= 1 && fileSizeMB <= 5) {
      score = Math.min(100, score + 5);
    }
  }

  return score;
}

/**
 * Calculate composition score based on aspect ratio
 */
function calculateCompositionScore(asset: GalleryAsset): number {
  if (!asset.aspectRatio) {
    return 70; // Default if aspect ratio unknown
  }

  // Ideal ratios for Instagram
  const idealRatios = [
    1.0, // 1:1 - square
    0.8, // 4:5 - portrait
    1.777, // 16:9 - landscape
  ];

  // Find closest ideal ratio
  const closestDiff = Math.min(
    ...idealRatios.map(r => Math.abs(asset.aspectRatio! - r))
  );

  // Score based on how close to ideal
  if (closestDiff < 0.05) return 90; // Very close to ideal
  if (closestDiff < 0.1) return 80; // Close to ideal
  if (closestDiff < 0.2) return 70; // Acceptable
  return 60; // Unusual ratio
}

/**
 * Generate insights based on factor scores
 */
function generateInsights(
  factors: ViralityFactors,
  asset: GalleryAsset
): { strengths: string[]; improvements: string[] } {
  const strengths: string[] = [];
  const improvements: string[] = [];

  // Quality
  if (factors.quality >= 85) {
    strengths.push('High resolution image');
  } else if (factors.quality < 70) {
    improvements.push('Consider using higher resolution images');
  }

  // Composition
  if (factors.composition >= 85) {
    strengths.push('Perfect aspect ratio for Instagram');
  } else if (factors.composition < 70 && asset.aspectRatio) {
    improvements.push('Crop to 1:1 or 4:5 for better Instagram performance');
  }

  // Color Appeal
  if (factors.colorAppeal >= 85) {
    strengths.push('Vibrant, appealing colors');
  }

  // Lighting
  if (factors.lighting >= 85) {
    strengths.push('Excellent lighting');
  } else if (factors.lighting < 70) {
    improvements.push('Improve lighting conditions');
  }

  // Subject Clarity
  if (factors.subjectClarity >= 85) {
    strengths.push('Clear, focused subject');
  } else if (factors.subjectClarity < 70) {
    improvements.push('Ensure subject is sharp and well-defined');
  }

  // Emotional Impact
  if (factors.emotionalImpact >= 85) {
    strengths.push('Strong emotional appeal');
  } else if (factors.emotionalImpact < 70) {
    improvements.push('Add visual elements that evoke emotion');
  }

  return { strengths, improvements };
}

/**
 * Get rating label based on score
 */
function getRating(score: number): ViralityAnalysis['rating'] {
  if (score >= 90) return 'viral';
  if (score >= 80) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 60) return 'fair';
  return 'poor';
}

/**
 * Quick virality score (async wrapper for convenience)
 */
export async function getQuickViralityScore(
  asset: GalleryAsset
): Promise<number> {
  const analysis = await calculateViralityScore(asset);
  return analysis.score;
}

/**
 * Batch analyze multiple assets
 */
export async function batchAnalyzeVirality(
  assets: GalleryAsset[]
): Promise<Map<string, ViralityAnalysis>> {
  const results = new Map<string, ViralityAnalysis>();

  for (const asset of assets) {
    const analysis = await calculateViralityScore(asset);
    results.set(asset.id, analysis);
  }

  return results;
}
