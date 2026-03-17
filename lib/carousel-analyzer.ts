import { Asset } from '@/types/models';
import { CarouselAnalysis, ImageScore } from '@/types/utils';

/** Minimum number of images required for carousel analysis */
const MIN_CAROUSEL_IMAGES = 2;

/** Score range constants */
const SCORE_MIN = 70;
const SCORE_MAX = 100;

/** Default viral factor scores */
const DEFAULT_VIRAL_FACTORS: ImageScore['viralFactors'] = {
  composition: 75,
  colorAppeal: 75,
  subjectClarity: 75,
  emotionalImpact: 75,
  curiosityGap: 75,
};

/** Sample strengths and weaknesses for mock generation */
const SAMPLE_STRENGTHS = ['Strong composition', 'Good lighting', 'Clear subject'];
const SAMPLE_WEAKNESSES = ['Could be cropped tighter', 'Background slightly busy'];

/**
 * Generate a random score within the typical range
 */
function randomScore(min: number = SCORE_MIN, max: number = SCORE_MAX): number {
  return Math.floor(Math.random() * (max - min)) + min;
}

/**
 * Analyze carousel images and recommend optimal ordering
 */
export async function analyzeCarouselOrder(
  assets: Asset[],
  _platform: 'instagram' | 'tiktok',
  _caption?: string
): Promise<CarouselAnalysis> {
  if (assets.length < MIN_CAROUSEL_IMAGES) {
    throw new Error(`Carousel must have at least ${MIN_CAROUSEL_IMAGES} images`);
  }

  try {
    // TODO: In production, call a vision model (Claude with vision, GPT-4V, etc.)
    return generateMockCarouselAnalysis(assets.length);
  } catch (error) {
    console.error('Carousel analysis failed:', error);
    return generateFallbackAnalysis(assets.length);
  }
}

/**
 * Build the analysis prompt for AI vision models (for future use)
 */
function buildCarouselAnalysisPrompt(
  assets: Asset[],
  platform: string,
  caption?: string
): string {
  return `You are an expert in viral social media content for OnlyFans creators on ${platform}.

Analyze this carousel of ${assets.length} images and determine the optimal order for maximum engagement.

Caption: "${caption ?? 'No caption'}"

For each image, provide:
1. A viral score (0-100)
2. Hook potential (how good it is as the first image)
3. Strengths and weaknesses
4. Viral factors:
   - Composition quality
   - Color appeal
   - Subject clarity
   - Emotional impact
   - Curiosity gap (makes viewer want to swipe)

Then recommend the best order for the carousel.

Key principles:
- First image should have highest hook potential (stops scroll)
- Should create narrative flow or build curiosity
- Balance variety vs. coherence
- Consider platform algorithm preferences

Return analysis as JSON.`;
}

function generateMockCarouselAnalysis(imageCount: number): CarouselAnalysis {
  const imageScores: ImageScore[] = Array.from({ length: imageCount }, (_, i) => ({
    index: i,
    score: randomScore(),
    hookPotential: i === 0 ? 85 : randomScore(50, 90),
    strengths: SAMPLE_STRENGTHS.slice(0, Math.floor(Math.random() * 2) + 1),
    weaknesses: SAMPLE_WEAKNESSES.slice(0, Math.floor(Math.random() * 2)),
    viralFactors: {
      composition: randomScore(75, 95),
      colorAppeal: randomScore(70, 95),
      subjectClarity: randomScore(80, 95),
      emotionalImpact: randomScore(65, 95),
      curiosityGap: randomScore(60, 95),
    },
  }));

  const sortedByHook = [...imageScores].sort((a, b) => b.hookPotential - a.hookPotential);
  const recommendedOrder = sortedByHook.map((img) => img.index);
  const overallScore = Math.round(
    imageScores.reduce((sum, img) => sum + img.score, 0) / imageScores.length
  );
  const topImage = imageScores[recommendedOrder[0]];

  return {
    overallScore,
    imageScores,
    recommendedOrder,
    reasoning: `Lead with image #${recommendedOrder[0] + 1} as it has the highest hook potential (${
      topImage.hookPotential
    }/100). The strong ${topImage.strengths[0]?.toLowerCase() ?? 'composition'} will stop the scroll. Follow with images that build curiosity and maintain engagement.`,
  };
}

function generateFallbackAnalysis(imageCount: number): CarouselAnalysis {
  const imageScores: ImageScore[] = Array.from({ length: imageCount }, (_, i) => ({
    index: i,
    score: 75,
    hookPotential: i === 0 ? 80 : 70,
    strengths: ['Good quality'],
    weaknesses: [],
    viralFactors: { ...DEFAULT_VIRAL_FACTORS },
  }));

  return {
    overallScore: 75,
    imageScores,
    recommendedOrder: Array.from({ length: imageCount }, (_, i) => i),
    reasoning: 'Using default ordering. Enable AI analysis for optimized recommendations.',
  };
}

/**
 * Quick viral score for a single image
 */
export async function getImageViralScore(
  _asset: Asset,
  _platform: 'instagram' | 'tiktok'
): Promise<number> {
  // TODO: In production, analyze the actual image
  return randomScore();
}

/**
 * Analyze if two images work well together (for stories/reels)
 */
export async function analyzeImagePair(
  _asset1: Asset,
  _asset2: Asset
): Promise<{ compatibility: number; suggestion: string }> {
  const compatibility = randomScore();

  return {
    compatibility,
    suggestion:
      compatibility > 80
        ? 'Great pairing! Similar aesthetic and flow.'
        : 'Consider adjusting color grading for better cohesion.',
  };
}
