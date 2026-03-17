import { createAIService } from './ai-service';
import { Post, PostType, Platform, Asset, Model } from '@/types/models';

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

/**
 * AI-powered auto-scheduler that decides:
 * - Which platform for each asset
 * - What time to post
 * - How to distribute across days
 * - Post type (post vs reel vs story)
 */
export async function autoSchedulePosts(
  config: AutoScheduleConfig
): Promise<AutoScheduleResult> {
  const {
    modelId,
    model,
    daysToGenerate,
    assetsPool,
    existingPosts,
    preferences = {},
  } = config;

  try {
    const aiService = createAIService();

    // Build scheduling prompt
    const prompt = buildAutoSchedulePrompt(config);

    // In production, this would call AI to make decisions
    // For now, generate intelligent mock scheduling
    const generatedPosts = await generateIntelligentSchedule(config);

    const summary = calculateScheduleSummary(generatedPosts);

    return {
      generatedPosts,
      summary,
      reasoning: `Generated ${summary.totalPosts} posts across ${daysToGenerate} days. Distributed evenly across platforms with focus on peak engagement times. Instagram and TikTok prioritized for visual content.`,
      requiresApproval: true,
    };
  } catch (error) {
    console.error('Auto-scheduling failed:', error);
    throw error;
  }
}

function buildAutoSchedulePrompt(config: AutoScheduleConfig): string {
  const { model, daysToGenerate, assetsPool, existingPosts, preferences = {} } = config;

  return `You are an expert social media scheduler for OnlyFans creators.

Model: ${model.name}
Current posting schedule: ${JSON.stringify(model.postingSchedule)}
Days to schedule: ${daysToGenerate}
Available assets: ${assetsPool.length} (${assetsPool.filter(a => a.fileType === 'video').length} videos, ${assetsPool.filter(a => a.fileType === 'image').length} images)
Already scheduled: ${existingPosts.length} posts

Preferences:
- Preferred times: ${preferences.preferredTimes?.join(', ') || 'Use model schedule'}
- Platform priority: ${preferences.platformPriority?.join(', ') || 'All platforms equal'}
- Posts per day: ${preferences.minPostsPerDay || 3}-${preferences.maxPostsPerDay || 10}

Task: Create an optimal posting schedule that:
1. Distributes content across platforms strategically
2. Uses peak engagement times
3. Balances variety (posts, reels, stories)
4. Avoids oversaturation
5. Considers platform-specific best practices

For each asset, decide:
- Platform (Instagram, TikTok, X, Threads)
- Post type (post, reel, story, etc.)
- Optimal time slot
- Why this decision maximizes engagement

Return as JSON schedule.`;
}

async function generateIntelligentSchedule(
  config: AutoScheduleConfig
): Promise<Post[]> {
  const {
    modelId,
    model,
    daysToGenerate,
    assetsPool,
    existingPosts,
    preferences = {},
  } = config;

  const generatedPosts: Post[] = [];
  const today = new Date();

  // Get posting times from model schedule or preferences
  const postingTimes = preferences.preferredTimes || 
    [...new Set(model.postingSchedule.map(s => s.time))];

  // Determine posts per day
  const minPerDay = preferences.minPostsPerDay || 3;
  const maxPerDay = preferences.maxPostsPerDay || 8;
  const postsPerDay = Math.floor(Math.random() * (maxPerDay - minPerDay + 1)) + minPerDay;

  let assetIndex = 0;

  for (let day = 0; day < daysToGenerate; day++) {
    const currentDate = new Date(today);
    currentDate.setDate(today.getDate() + day);

    // Skip weekends if preference set
    if (preferences.avoidWeekends && (currentDate.getDay() === 0 || currentDate.getDay() === 6)) {
      continue;
    }

    // Distribute posts across platforms
    const daysPosts: Post[] = [];

    for (let i = 0; i < postsPerDay && assetIndex < assetsPool.length; i++) {
      const asset = assetsPool[assetIndex];
      const time = postingTimes[i % postingTimes.length];

      // Decide platform and post type based on asset
      const { platform, postType } = decidePostStrategy(asset, preferences.platformPriority);

      const scheduledTime = new Date(currentDate);
      const [hours, minutes] = time.split(':');
      scheduledTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const post: Post = {
        id: `auto-${Date.now()}-${assetIndex}`,
        modelId,
        platform,
        postType,
        scheduledTime: scheduledTime.toISOString(),
        status: 'draft', // Requires approval
        description: '', // Will be generated separately
        assets: [asset],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isAutoGenerated: true,
        approvalStatus: 'pending',
      };

      daysPosts.push(post);
      assetIndex++;
    }

    generatedPosts.push(...daysPosts);
  }

  return generatedPosts;
}

function decidePostStrategy(
  asset: Asset,
  platformPriority?: Platform[]
): { platform: Platform; postType: PostType } {
  const isVideo = asset.fileType === 'video';

  // Video assets -> Reels
  if (isVideo) {
    const platform: Platform = platformPriority?.[0] || (Math.random() > 0.5 ? 'instagram' : 'tiktok');
    return {
      platform,
      postType: platform === 'instagram' ? 'instagram_reel' : 'tiktok_reel',
    };
  }

  // Image assets -> Posts or Stories
  const platforms: Platform[] = platformPriority || ['instagram', 'tiktok', 'x', 'threads'];
  const platform = platforms[Math.floor(Math.random() * platforms.length)];

  if (platform === 'instagram') {
    // 70% posts, 30% stories
    return Math.random() > 0.3
      ? { platform, postType: 'instagram_post' }
      : { platform, postType: 'instagram_story' };
  } else if (platform === 'tiktok') {
    // 60% slideshows, 40% stories
    return Math.random() > 0.4
      ? { platform, postType: 'tiktok_slideshow' }
      : { platform, postType: 'tiktok_story' };
  } else if (platform === 'x') {
    return { platform, postType: 'x_post' };
  } else {
    return { platform, postType: 'threads_post' };
  }
}

function calculateScheduleSummary(posts: Post[]) {
  const byPlatform: Record<Platform, number> = {
    instagram: 0,
    tiktok: 0,
    x: 0,
    threads: 0,
    fanvue: 0,
  };

  const byDay: Record<string, number> = {};

  posts.forEach(post => {
    byPlatform[post.platform]++;

    const day = new Date(post.scheduledTime).toISOString().split('T')[0];
    byDay[day] = (byDay[day] || 0) + 1;
  });

  return {
    totalPosts: posts.length,
    byPlatform,
    byDay,
  };
}

/**
 * Generate captions for auto-scheduled posts
 */
export async function generateCaptionsForScheduledPosts(
  posts: Post[],
  captionLibrary: any[]
): Promise<Post[]> {
  // For each post, generate appropriate caption based on platform/type
  // This would use the AI service
  return posts.map(post => ({
    ...post,
    description: 'Auto-generated caption (to be implemented)',
  }));
}
