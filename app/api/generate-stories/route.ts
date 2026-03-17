import { NextRequest } from 'next/server';
import { Post, Asset } from '@/types/models';
import type { CropStrategy } from '@/types/ai';
import {
  parseRequestBody,
  validateRequiredFields,
  successResponse,
  errorResponse,
  withErrorHandler,
} from '@/lib/api-utils';

// Story categories and their S3 folder paths
const STORY_CATEGORIES = {
  'daily-life': 'stories/daily-life',
  'food': 'stories/food',
  'selfie': 'stories/selfies',
  'gym': 'stories/gym',
} as const;

const CROP_STRATEGIES: CropStrategy[] = ['center', 'top', 'bottom', 'random'];

interface GenerateStoriesRequest {
  modelId: string;
  date: string; // ISO date string
  storiesPerDay?: number;
}

interface GenerateStoriesResponse {
  stories: Post[];
  count: number;
}

/**
 * Calculate crop position for 9:16 aspect ratio (1080x1920)
 * @param originalWidth - Original image width
 * @param originalHeight - Original image height
 * @param strategy - Cropping strategy
 */
function calculateCropPosition(
  originalWidth: number,
  originalHeight: number,
  strategy: CropStrategy = 'random'
) {
  const targetRatio = 9 / 16; // 0.5625
  const originalRatio = originalWidth / originalHeight;

  let cropWidth: number;
  let cropHeight: number;
  let x: number = 0;
  let y: number = 0;

  // If image is wider than 9:16, crop width
  if (originalRatio > targetRatio) {
    cropHeight = originalHeight;
    cropWidth = cropHeight * targetRatio;

    // Determine horizontal position based on strategy
    switch (strategy) {
      case 'center':
        x = (originalWidth - cropWidth) / 2;
        break;
      case 'random':
        x = Math.random() * (originalWidth - cropWidth);
        break;
      default:
        x = (originalWidth - cropWidth) / 2;
    }
  }
  // If image is taller than 9:16, crop height
  else {
    cropWidth = originalWidth;
    cropHeight = cropWidth / targetRatio;

    // Determine vertical position based on strategy
    switch (strategy) {
      case 'top':
        y = 0;
        break;
      case 'center':
        y = (originalHeight - cropHeight) / 2;
        break;
      case 'bottom':
        y = originalHeight - cropHeight;
        break;
      case 'random':
        y = Math.random() * (originalHeight - cropHeight);
        break;
      default:
        y = (originalHeight - cropHeight) / 2;
    }
  }

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(cropWidth),
    height: Math.round(cropHeight),
  };
}

/**
 * Get random image from S3 folder
 * This is a placeholder - will be replaced with actual S3 implementation
 */
async function getRandomImageFromCategory(category: keyof typeof STORY_CATEGORIES) {
  // TODO: Replace with actual S3 SDK call
  // const s3 = new AWS.S3();
  // const params = {
  //   Bucket: process.env.AWS_S3_BUCKET,
  //   Prefix: STORY_CATEGORIES[category]
  // };
  // const data = await s3.listObjectsV2(params).promise();
  // const images = data.Contents.filter(obj => obj.Key.match(/\.(jpg|jpeg|png)$/i));
  // const randomImage = images[Math.floor(Math.random() * images.length)];
  // return randomImage.Key;

  // Mock implementation for now
  return {
    key: `${STORY_CATEGORIES[category]}/mock-image-${Date.now()}.jpg`,
    url: '/demo-image.jpg',
    width: 1920, // Mock dimensions
    height: 1080,
  };
}

/**
 * Generate story posts for a model
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await parseRequestBody<GenerateStoriesRequest>(request);

  // Validate required fields
  const validation = validateRequiredFields(body, ['modelId', 'date']);

  if (!validation.valid) {
    return errorResponse(
      `Missing required fields: ${validation.missing.join(', ')}`,
      400
    );
  }

  const { modelId, date, storiesPerDay = 4 } = body;

  // Validate storiesPerDay
  if (storiesPerDay < 1 || storiesPerDay > 10) {
    return errorResponse('storiesPerDay must be between 1 and 10', 400);
  }

  // Validate date format
  try {
    new Date(date);
  } catch {
    return errorResponse('Invalid date format. Use ISO date string', 400);
  }

  const generatedStories: Post[] = [];

  // Determine which categories to use for today's stories
  const categories = Object.keys(STORY_CATEGORIES) as Array<keyof typeof STORY_CATEGORIES>;

  // Generate stories evenly distributed throughout the day
  const timeSlots = ['08:00', '12:00', '16:00', '20:00'].slice(0, storiesPerDay);

  for (let i = 0; i < storiesPerDay; i++) {
    // Randomly select category
    const category = categories[Math.floor(Math.random() * categories.length)];

    // Get random image from that category
    const image = await getRandomImageFromCategory(category);

    // Random crop strategy
    const strategy = CROP_STRATEGIES[Math.floor(Math.random() * CROP_STRATEGIES.length)];

    // Calculate crop position
    const cropConfig = calculateCropPosition(image.width, image.height, strategy);

    // Determine platform (alternate between Instagram and TikTok)
    const platform = i % 2 === 0 ? 'instagram' : 'tiktok';
    const postType = platform === 'instagram' ? 'instagram_story' : 'tiktok_story';

    // Create asset
    const asset: Asset = {
      id: `asset-story-${Date.now()}-${i}`,
      postId: '', // Will be set when post is created
      fileUrl: image.url,
      fileName: image.key,
      fileType: 'image',
      order: 1,
      originalDimensions: { width: image.width, height: image.height },
      cropConfig: {
        strategy,
        position: cropConfig,
      },
    };

    // Create story post
    const scheduledTime = new Date(date);
    const [hours, minutes] = timeSlots[i].split(':');
    scheduledTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    const story: Post = {
      id: `post-story-${Date.now()}-${i}`,
      modelId,
      platform,
      postType,
      scheduledTime: scheduledTime.toISOString(),
      status: 'draft', // Starts as draft, needs approval
      description: '', // No description for stories initially
      assets: [asset],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isAutoGenerated: true,
      approvalStatus: 'pending',
      storyCategory: category,
    };

    // Update asset's postId
    asset.postId = story.id;

    generatedStories.push(story);
  }

  return successResponse<GenerateStoriesResponse>({
    stories: generatedStories,
    count: generatedStories.length,
  });
});
