import { StoryGenerationConfig, StoryFolderConfig, StoryCropStrategy } from '@/types/ai-config';
import { Post, Asset } from '@/types/models';

interface ImageDimensions {
  width: number;
  height: number;
}

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
      // In real implementation, this would fetch from S3
      const randomImage = await this.selectRandomImageFromFolder(folder);
      if (!randomImage) continue;

      // Generate unique crop for 9:16 aspect ratio
      const cropConfig = this.generateUniqueCrop(randomImage.dimensions);

      // Create Instagram story
      const instagramStory = this.createStoryPost({
        platform: 'instagram',
        folder,
        image: randomImage,
        cropConfig,
        date,
      });
      stories.push(instagramStory);

      // Create TikTok story (same image, potentially different crop)
      const tiktokCropConfig = this.generateUniqueCrop(randomImage.dimensions);
      const tiktokStory = this.createStoryPost({
        platform: 'tiktok',
        folder,
        image: randomImage,
        cropConfig: tiktokCropConfig,
        date,
      });
      stories.push(tiktokStory);
    }

    return stories;
  }

  /**
   * Select which folders to use based on distribution preferences
   */
  private selectFoldersForDay(): StoryFolderConfig[] {
    const enabledFolders = this.config.folders.filter((f) => f.enabled);
    const selected: StoryFolderConfig[] = [];

    // Calculate how many stories from each category
    const distribution = this.config.distributionPreference || {
      'daily-life': 30,
      'food': 20,
      'selfie': 30,
      'gym': 15,
      'other': 5,
    };

    const storyCount = this.config.dailyCount || 3;
    
    // Weighted random selection
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
    const weights = folders.map((f) => {
      const categoryWeight = distribution[f.category] || 10;
      return (f.weight / 10) * (categoryWeight / 100);
    });

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < folders.length; i++) {
      random -= weights[i];
      if (random <= 0) return folders[i];
    }

    return folders[0] || null;
  }

  /**
   * Select random image from S3 folder
   * In production, this would:
   * 1. List objects in S3 path
   * 2. Filter for image files
   * 3. Select random one
   * 4. Get image dimensions
   */
  private async selectRandomImageFromFolder(
    folder: StoryFolderConfig
  ): Promise<{ url: string; dimensions: ImageDimensions; filename: string } | null> {
    // TODO: Implement S3 integration
    // For now, return mock data
    
    // Example S3 implementation:
    // const s3Client = new S3Client({...});
    // const command = new ListObjectsV2Command({
    //   Bucket: process.env.S3_BUCKET,
    //   Prefix: folder.s3Path,
    // });
    // const response = await s3Client.send(command);
    // const imageObjects = response.Contents?.filter(obj => 
    //   /\.(jpg|jpeg|png|webp)$/i.test(obj.Key || '')
    // );
    // const randomObj = imageObjects[Math.floor(Math.random() * imageObjects.length)];
    // const imageUrl = await getSignedUrl(...);
    // const dimensions = await getImageDimensions(imageUrl);
    
    return {
      url: '/demo-image.jpg',
      dimensions: { width: 1080, height: 1350 }, // Common IG post dimensions
      filename: `${folder.category}-${Date.now()}.jpg`,
    };
  }

  /**
   * Generate unique crop configuration for 9:16 aspect ratio
   * Uses various strategies to create interesting, non-repetitive crops
   */
  private generateUniqueCrop(originalDimensions: ImageDimensions) {
    const targetAspectRatio = 9 / 16; // Story aspect ratio (portrait)
    const strategies = this.config.cropStrategies || [
      { strategy: 'center' as const },
      { strategy: 'top' as const },
      { strategy: 'bottom' as const },
      { strategy: 'random' as const },
      { strategy: 'rule-of-thirds' as const },
    ];

    // Pick random strategy
    const strategy = strategies[Math.floor(Math.random() * strategies.length)];

    // Calculate crop dimensions for 9:16
    let cropWidth: number;
    let cropHeight: number;

    // If image is already taller than 16:9, crop width
    const imageAspectRatio = originalDimensions.width / originalDimensions.height;
    
    if (imageAspectRatio > targetAspectRatio) {
      // Image is too wide - crop sides
      cropHeight = originalDimensions.height;
      cropWidth = cropHeight * targetAspectRatio;
    } else {
      // Image is too tall - crop top/bottom
      cropWidth = originalDimensions.width;
      cropHeight = cropWidth / targetAspectRatio;
    }

    // Ensure crop doesn't exceed original dimensions
    cropWidth = Math.min(cropWidth, originalDimensions.width);
    cropHeight = Math.min(cropHeight, originalDimensions.height);

    // Calculate position based on strategy
    let x = 0;
    let y = 0;

    switch (strategy.strategy) {
      case 'center':
        x = (originalDimensions.width - cropWidth) / 2;
        y = (originalDimensions.height - cropHeight) / 2;
        break;

      case 'top':
        x = (originalDimensions.width - cropWidth) / 2;
        y = 0;
        break;

      case 'bottom':
        x = (originalDimensions.width - cropWidth) / 2;
        y = originalDimensions.height - cropHeight;
        break;

      case 'random':
        const maxX = originalDimensions.width - cropWidth;
        const maxY = originalDimensions.height - cropHeight;
        x = Math.random() * maxX;
        y = Math.random() * maxY;
        break;

      case 'rule-of-thirds':
        // Position at intersection of rule of thirds lines
        const thirdsX = [
          originalDimensions.width / 3,
          (originalDimensions.width * 2) / 3,
        ];
        const thirdsY = [
          originalDimensions.height / 3,
          (originalDimensions.height * 2) / 3,
        ];
        
        const chosenThirdX = thirdsX[Math.floor(Math.random() * 2)];
        const chosenThirdY = thirdsY[Math.floor(Math.random() * 2)];
        
        x = Math.max(0, Math.min(chosenThirdX - cropWidth / 2, originalDimensions.width - cropWidth));
        y = Math.max(0, Math.min(chosenThirdY - cropHeight / 2, originalDimensions.height - cropHeight));
        break;

      case 'face-detect':
        // TODO: Implement face detection
        // For now, default to center
        x = (originalDimensions.width - cropWidth) / 2;
        y = (originalDimensions.height - cropHeight) / 2;
        break;
    }

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
   * Create a story post object
   */
  private createStoryPost(params: {
    platform: 'instagram' | 'tiktok';
    folder: StoryFolderConfig;
    image: { url: string; dimensions: ImageDimensions; filename: string };
    cropConfig: { strategy: StoryCropStrategy['strategy']; position: { x: number; y: number; width: number; height: number } };
    date: Date;
  }): Post {
    const { platform, folder, image, cropConfig, date } = params;

    // Generate random time for story (distribute throughout the day)
    const hour = 8 + Math.floor(Math.random() * 12); // 8am - 8pm
    const minute = Math.floor(Math.random() * 60);
    const scheduledTime = new Date(date);
    scheduledTime.setHours(hour, minute, 0, 0);

    const asset: Asset = {
      id: `asset-${Date.now()}-${Math.random()}`,
      postId: '', // Will be set when post is created
      fileUrl: image.url,
      fileName: image.filename,
      fileType: 'image',
      order: 1,
      originalDimensions: image.dimensions,
      cropConfig,
    };

    const post: Post = {
      id: `story-${Date.now()}-${Math.random()}`,
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

    return post;
  }

  /**
   * Generate simple caption based on story category
   */
  private generateStoryCaption(category: string): string {
    const captions: Record<string, string[]> = {
      'daily-life': ['Just vibing ✨', 'Today\'s mood 💫', 'Living my best life 🌟'],
      'food': ['Yummy 🍽️', 'Food coma incoming 😋', 'Treat yourself 🍰'],
      'selfie': ['Feeling cute 💕', 'Selfie time 📸', 'Quick pic ✨'],
      'gym': ['Gym time 💪', 'Workout done ✅', 'Gains incoming 🏋️'],
      'other': ['Check this out 👀', 'Quick share ✨', '💫'],
    };

    const options = captions[category] || captions['other'];
    return options[Math.floor(Math.random() * options.length)];
  }
}

/**
 * API endpoint helper to trigger story generation
 */
export async function generateStoriesForModel(
  modelId: string,
  config: StoryGenerationConfig
): Promise<Post[]> {
  const service = new StoryGenerationService(config);
  const today = new Date();
  return service.generateDailyStories(today);
}
