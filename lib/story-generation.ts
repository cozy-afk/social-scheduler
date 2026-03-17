import { StoryGenerationConfig, StoryFolderConfig, StoryCropStrategy } from '@/types/ai';
import { Post, Asset } from '@/types/models';

interface ImageDimensions {
  width: number;
  height: number;
}

interface SelectedImage {
  url: string;
  dimensions: ImageDimensions;
  filename: string;
}

interface CropConfig {
  strategy: StoryCropStrategy['strategy'];
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/** Default distribution preferences when not specified */
const DEFAULT_DISTRIBUTION: Record<string, number> = {
  'daily-life': 30,
  'food': 20,
  'selfie': 30,
  'gym': 15,
  'other': 5,
};

/** Default crop strategies when not specified */
const DEFAULT_CROP_STRATEGIES: StoryCropStrategy[] = [
  { strategy: 'center' },
  { strategy: 'top' },
  { strategy: 'bottom' },
  { strategy: 'random' },
  { strategy: 'rule-of-thirds' },
];

/** Story aspect ratio (9:16 portrait) */
const STORY_ASPECT_RATIO = 9 / 16;

export class StoryGenerationService {
  private config: StoryGenerationConfig;

  constructor(config: StoryGenerationConfig) {
    this.config = config;
  }

  /**
   * Generate stories for a specific day
   * Randomly selects images from configured folders and creates crop previews
   */
  async generateDailyStories(date: Date): Promise<Post[]> {
    const stories: Post[] = [];
    const selectedFolders = this.selectFoldersForDay();

    for (const folder of selectedFolders) {
      try {
        const randomImage = await this.selectRandomImageFromFolder(folder);
        if (!randomImage) continue;

        // Create Instagram story with unique crop
        const instagramStory = this.createStoryPost({
          platform: 'instagram',
          folder,
          image: randomImage,
          cropConfig: this.generateUniqueCrop(randomImage.dimensions),
          date,
        });
        stories.push(instagramStory);

        // Create TikTok story (same image, different crop)
        const tiktokStory = this.createStoryPost({
          platform: 'tiktok',
          folder,
          image: randomImage,
          cropConfig: this.generateUniqueCrop(randomImage.dimensions),
          date,
        });
        stories.push(tiktokStory);
      } catch (error) {
        console.error(`Failed to generate story for folder ${folder.name}:`, error);
        // Continue with other folders on error
      }
    }

    return stories;
  }

  /**
   * Select which folders to use based on distribution preferences
   */
  private selectFoldersForDay(): StoryFolderConfig[] {
    const enabledFolders = this.config.folders.filter((f) => f.enabled);
    if (enabledFolders.length === 0) {
      return [];
    }

    const distribution = this.config.distributionPreference ?? DEFAULT_DISTRIBUTION;
    const storyCount = this.config.dailyCount ?? 3;
    const selected: StoryFolderConfig[] = [];

    for (let i = 0; i < storyCount; i++) {
      const folder = this.weightedRandomSelect(enabledFolders, distribution);
      if (folder) selected.push(folder);
    }

    return selected;
  }

  /**
   * Weighted random selection based on folder weights and distribution prefs
   */
  private weightedRandomSelect(
    folders: StoryFolderConfig[],
    distribution: Record<string, number>
  ): StoryFolderConfig | null {
    if (folders.length === 0) return null;

    const weights = folders.map((f) => {
      const categoryWeight = distribution[f.category] ?? 10;
      return (f.weight / 10) * (categoryWeight / 100);
    });

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < folders.length; i++) {
      random -= weights[i];
      if (random <= 0) return folders[i];
    }

    return folders[0] ?? null;
  }

  /**
   * Select random image from S3 folder
   * TODO: Implement S3 integration
   */
  private async selectRandomImageFromFolder(
    folder: StoryFolderConfig
  ): Promise<SelectedImage | null> {
    // Mock implementation - replace with actual S3 integration
    return {
      url: '/demo-image.jpg',
      dimensions: { width: 1080, height: 1350 },
      filename: `${folder.category}-${Date.now()}.jpg`,
    };
  }

  /**
   * Generate unique crop configuration for 9:16 aspect ratio
   * Uses various strategies to create interesting, non-repetitive crops
   */
  private generateUniqueCrop(originalDimensions: ImageDimensions): CropConfig {
    const strategies = this.config.cropStrategies ?? DEFAULT_CROP_STRATEGIES;
    const strategy = strategies[Math.floor(Math.random() * strategies.length)];
    const { x, y, cropWidth, cropHeight } = this.calculateCropPosition(
      strategy,
      originalDimensions
    );

    return {
      strategy: strategy.strategy,
      position: {
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(cropWidth),
        height: Math.round(cropHeight),
      },
    };
  }

  /**
   * Calculate crop dimensions and position based on strategy
   */
  private calculateCropPosition(
    strategy: StoryCropStrategy,
    originalDimensions: ImageDimensions
  ): { x: number; y: number; cropWidth: number; cropHeight: number } {
    const imageAspectRatio = originalDimensions.width / originalDimensions.height;
    let cropWidth: number;
    let cropHeight: number;

    if (imageAspectRatio > STORY_ASPECT_RATIO) {
      cropHeight = originalDimensions.height;
      cropWidth = cropHeight * STORY_ASPECT_RATIO;
    } else {
      cropWidth = originalDimensions.width;
      cropHeight = cropWidth / STORY_ASPECT_RATIO;
    }

    cropWidth = Math.min(cropWidth, originalDimensions.width);
    cropHeight = Math.min(cropHeight, originalDimensions.height);

    const position = this.getCropPositionByStrategy(
      strategy.strategy,
      originalDimensions,
      cropWidth,
      cropHeight
    );

    return { ...position, cropWidth, cropHeight };
  }

  /**
   * Get crop position based on strategy type
   */
  private getCropPositionByStrategy(
    strategyType: StoryCropStrategy['strategy'],
    dims: ImageDimensions,
    cropWidth: number,
    cropHeight: number
  ): { x: number; y: number } {
    switch (strategyType) {
      case 'center':
        return {
          x: (dims.width - cropWidth) / 2,
          y: (dims.height - cropHeight) / 2,
        };

      case 'top':
        return {
          x: (dims.width - cropWidth) / 2,
          y: 0,
        };

      case 'bottom':
        return {
          x: (dims.width - cropWidth) / 2,
          y: dims.height - cropHeight,
        };

      case 'random':
        return {
          x: Math.random() * (dims.width - cropWidth),
          y: Math.random() * (dims.height - cropHeight),
        };

      case 'rule-of-thirds':
        return this.getRuleOfThirdsPosition(dims, cropWidth, cropHeight);

      case 'face-detect':
        // TODO: Implement face detection, fallback to center
        return {
          x: (dims.width - cropWidth) / 2,
          y: (dims.height - cropHeight) / 2,
        };

      default:
        return {
          x: (dims.width - cropWidth) / 2,
          y: (dims.height - cropHeight) / 2,
        };
    }
  }

  /**
   * Calculate position at rule of thirds intersection
   */
  private getRuleOfThirdsPosition(
    dims: ImageDimensions,
    cropWidth: number,
    cropHeight: number
  ): { x: number; y: number } {
    const thirdsX = [dims.width / 3, (dims.width * 2) / 3];
    const thirdsY = [dims.height / 3, (dims.height * 2) / 3];

    const chosenX = thirdsX[Math.floor(Math.random() * 2)];
    const chosenY = thirdsY[Math.floor(Math.random() * 2)];

    return {
      x: Math.max(0, Math.min(chosenX - cropWidth / 2, dims.width - cropWidth)),
      y: Math.max(0, Math.min(chosenY - cropHeight / 2, dims.height - cropHeight)),
    };
  }

  /**
   * Create a story post object
   */
  private createStoryPost(params: {
    platform: 'instagram' | 'tiktok';
    folder: StoryFolderConfig;
    image: SelectedImage;
    cropConfig: CropConfig;
    date: Date;
  }): Post {
    const { platform, folder, image, cropConfig, date } = params;
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).slice(2, 8);

    // Distribute stories throughout the day (8am - 8pm)
    const hour = 8 + Math.floor(Math.random() * 12);
    const minute = Math.floor(Math.random() * 60);
    const scheduledTime = new Date(date);
    scheduledTime.setHours(hour, minute, 0, 0);

    const asset: Asset = {
      id: `asset-${timestamp}-${randomSuffix}`,
      postId: '',
      fileUrl: image.url,
      fileName: image.filename,
      fileType: 'image',
      order: 1,
      originalDimensions: image.dimensions,
      cropConfig,
    };

    return {
      id: `story-${timestamp}-${randomSuffix}`,
      modelId: this.config.modelId,
      platform,
      postType: platform === 'instagram' ? 'instagram_story' : 'tiktok_story',
      scheduledTime: scheduledTime.toISOString(),
      status: this.config.requiresApproval ? 'draft' : 'scheduled',
      description: this.generateStoryCaption(folder.category),
      assets: [asset],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isAutoGenerated: true,
      approvalStatus: this.config.requiresApproval ? 'pending' : 'approved',
      storyCategory: folder.category,
    };
  }

  /**
   * Generate simple caption based on story category
   */
  private generateStoryCaption(category: string): string {
    const captions: Record<string, string[]> = {
      'daily-life': ['Just vibing', "Today's mood", 'Living my best life'],
      'food': ['Yummy', 'Food coma incoming', 'Treat yourself'],
      'selfie': ['Feeling cute', 'Selfie time', 'Quick pic'],
      'gym': ['Gym time', 'Workout done', 'Gains incoming'],
      'other': ['Check this out', 'Quick share', 'Moments'],
    };

    const options = captions[category] ?? captions['other'];
    return options[Math.floor(Math.random() * options.length)];
  }
}

/**
 * API endpoint helper to trigger story generation
 */
export async function generateStoriesForModel(
  config: StoryGenerationConfig
): Promise<Post[]> {
  const service = new StoryGenerationService(config);
  return service.generateDailyStories(new Date());
}
