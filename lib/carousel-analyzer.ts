import { Asset } from '@/types/models';
import { createAIService } from './ai-service';

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

/**
 * Analyze carousel images and recommend optimal ordering
 */
export async function analyzeCarouselOrder(
  assets: Asset[],
  platform: 'instagram' | 'tiktok',
  caption?: string
): Promise<CarouselAnalysis> {
  if (assets.length < 2) {
    throw new Error('Carousel must have at least 2 images');
  }

  try {
    const aiService = createAIService();
    
    // Build analysis prompt
    const prompt = buildCarouselAnalysisPrompt(assets, platform, caption);
    
    // For now, use caption generation endpoint but we'll create a dedicated one
    // In production, you'd call a vision model (Claude with vision, GPT-4V, etc.)
    
    // Mock response for prototype
    const mockAnalysis = generateMockCarouselAnalysis(assets.length);
    
    return mockAnalysis;
  } catch (error) {
    console.error('Carousel analysis failed:', error);
    // Return basic analysis on error
    return generateFallbackAnalysis(assets.length);
  }
}

function buildCarouselAnalysisPrompt(
  assets: Asset[],
  platform: string,
  caption?: string
): string {
  return `You are an expert in viral social media content for OnlyFans creators on ${platform}.

Analyze this carousel of ${assets.length} images and determine the optimal order for maximum engagement.

Caption: "${caption || 'No caption'}"

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

Return analysis as JSON:
{
  "overallScore": 85,
  "imageScores": [
    {
      "index": 0,
      "score": 92,
      "hookPotential": 95,
      "strengths": ["Strong eye contact", "Vibrant colors"],
      "weaknesses": ["Slightly busy background"],
      "viralFactors": { ... }
    }
  ],
  "recommendedOrder": [2, 0, 1, 3, 4],
  "reasoning": "Lead with image #3 because..."
}`;
}

function generateMockCarouselAnalysis(imageCount: number): CarouselAnalysis {
  const imageScores: ImageScore[] = Array.from({ length: imageCount }, (_, i) => ({
    index: i,
    score: Math.floor(Math.random() * 30) + 70, // 70-100
    hookPotential: i === 0 ? 85 : Math.floor(Math.random() * 40) + 50,
    strengths: [
      'Strong composition',
      'Good lighting',
      'Clear subject',
    ].slice(0, Math.floor(Math.random() * 2) + 1),
    weaknesses: [
      'Could be cropped tighter',
      'Background slightly busy',
    ].slice(0, Math.floor(Math.random() * 2)),
    viralFactors: {
      composition: Math.floor(Math.random() * 20) + 75,
      colorAppeal: Math.floor(Math.random() * 25) + 70,
      subjectClarity: Math.floor(Math.random() * 15) + 80,
      emotionalImpact: Math.floor(Math.random() * 30) + 65,
      curiosityGap: Math.floor(Math.random() * 35) + 60,
    },
  }));

  // Sort by hook potential to get recommended order
  const sortedByHook = [...imageScores].sort((a, b) => b.hookPotential - a.hookPotential);
  const recommendedOrder = sortedByHook.map(img => img.index);

  // Calculate overall score
  const overallScore = Math.floor(
    imageScores.reduce((sum, img) => sum + img.score, 0) / imageScores.length
  );

  return {
    overallScore,
    imageScores,
    recommendedOrder,
    reasoning: `Lead with image #${recommendedOrder[0] + 1} as it has the highest hook potential (${
      imageScores[recommendedOrder[0]].hookPotential
    }/100). The strong ${imageScores[recommendedOrder[0]].strengths[0].toLowerCase()} will stop the scroll. Follow with images that build curiosity and maintain engagement.`,
  };
}

function generateFallbackAnalysis(imageCount: number): CarouselAnalysis {
  const imageScores: ImageScore[] = Array.from({ length: imageCount }, (_, i) => ({
    index: i,
    score: 75,
    hookPotential: i === 0 ? 80 : 70,
    strengths: ['Good quality'],
    weaknesses: [],
    viralFactors: {
      composition: 75,
      colorAppeal: 75,
      subjectClarity: 75,
      emotionalImpact: 75,
      curiosityGap: 75,
    },
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
  asset: Asset,
  platform: 'instagram' | 'tiktok'
): Promise<number> {
  // In production, this would analyze the actual image
  // For now, return mock score
  return Math.floor(Math.random() * 30) + 70; // 70-100
}

/**
 * Analyze if two images work well together (for stories/reels)
 */
export async function analyzeImagePair(
  asset1: Asset,
  asset2: Asset
): Promise<{
  compatibility: number; // 0-100
  suggestion: string;
}> {
  const compatibility = Math.floor(Math.random() * 30) + 70;
  
  return {
    compatibility,
    suggestion: compatibility > 80
      ? 'Great pairing! Similar aesthetic and flow.'
      : 'Consider adjusting color grading for better cohesion.',
  };
}
