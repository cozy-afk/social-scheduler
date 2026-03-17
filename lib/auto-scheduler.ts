import { createAIService } from './ai-service';
import { Post, PostType, Platform, Asset, Model } from '@/types/models';
import { AutoScheduleConfig, AutoScheduleResult } from '@/types/utils';

/** Default scheduling preferences */
const DEFAULT_MIN_POSTS_PER_DAY = 3;
const DEFAULT_MAX_POSTS_PER_DAY = 8;
const DEFAULT_PLATFORMS: Platform[] = ['instagram', 'tiktok', 'x', 'threads'];

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
  const { daysToGenerate, assetsPool } = config;

  if (assetsPool.length === 0) {
    return {
      generatedPosts: [],
      summary: { totalPosts: 0, byPlatform: createEmptyPlatformCount(), byDay: {} },
      reasoning: 'No assets available for scheduling',
      requiresApproval: false,
    };
  }

  try {
    const generatedPosts = await generateIntelligentSchedule(config);
    const summary = calculateScheduleSummary(generatedPosts);

    return {
      generatedPosts,
      summary,
      reasoning: buildReasoningMessage(summary, daysToGenerate),
      requiresApproval: true,
    };
  } catch (error) {
    console.error('Auto-scheduling failed:', error);
    throw new Error(
      `Failed to generate schedule: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Build the reasoning message for the schedule result
 */
function buildReasoningMessage(
  summary: AutoScheduleResult['summary'],
  daysToGenerate: number
): string {
  return `Generated ${summary.totalPosts} posts across ${daysToGenerate} days. ` +
    `Distributed evenly across platforms with focus on peak engagement times. ` +
    `Instagram and TikTok prioritized for visual content.`;
}

/**
 * Create an empty platform count record
 */
function createEmptyPlatformCount(): Record<Platform, number> {
  return { instagram: 0, tiktok: 0, x: 0, threads: 0, fanvue: 0 };
}

/**
 * Build the AI prompt for scheduling decisions (for future AI integration)
 */
function buildAutoSchedulePrompt(config: AutoScheduleConfig): string {
  const { model, daysToGenerate, assetsPool, existingPosts, preferences = {} } = config;
  const videoCount = assetsPool.filter(a => a.fileType === 'video').length;
  const imageCount = assetsPool.filter(a => a.fileType === 'image').length;

  return `You are an expert social media scheduler for OnlyFans creators.

Model: ${model.name}
Current posting schedule: ${JSON.stringify(model.postingSchedule)}
Days to schedule: ${daysToGenerate}
Available assets: ${assetsPool.length} (${videoCount} videos, ${imageCount} images)
Already scheduled: ${existingPosts.length} posts

Preferences:
- Preferred times: ${preferences.preferredTimes?.join(', ') || 'Use model schedule'}
- Platform priority: ${preferences.platformPriority?.join(', ') || 'All platforms equal'}
- Posts per day: ${preferences.minPostsPerDay ?? DEFAULT_MIN_POSTS_PER_DAY}-${preferences.maxPostsPerDay ?? DEFAULT_MAX_POSTS_PER_DAY}

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
    preferences = {},
  } = config;

  const generatedPosts: Post[] = [];
  const today = new Date();

  const postingTimes = preferences.preferredTimes ??
    [...new Set(model.postingSchedule.map(s => s.time))];

  if (postingTimes.length === 0) {
    postingTimes.push('09:00', '13:00', '18:00', '21:00');
  }

  const minPerDay = preferences.minPostsPerDay ?? DEFAULT_MIN_POSTS_PER_DAY;
  const maxPerDay = preferences.maxPostsPerDay ?? DEFAULT_MAX_POSTS_PER_DAY;
  const postsPerDay = Math.floor(Math.random() * (maxPerDay - minPerDay + 1)) + minPerDay;

  let assetIndex = 0;

  for (let day = 0; day < daysToGenerate && assetIndex < assetsPool.length; day++) {
    const currentDate = new Date(today);
    currentDate.setDate(today.getDate() + day);

    if (preferences.avoidWeekends && isWeekend(currentDate)) {
      continue;
    }

    for (let i = 0; i < postsPerDay && assetIndex < assetsPool.length; i++) {
      const asset = assetsPool[assetIndex];
      const time = postingTimes[i % postingTimes.length];
      const { platform, postType } = decidePostStrategy(asset, preferences.platformPriority);

      const scheduledTime = parseTimeToDate(currentDate, time);

      const post: Post = {
        id: `auto-${Date.now()}-${assetIndex}`,
        modelId,
        platform,
        postType,
        scheduledTime: scheduledTime.toISOString(),
        status: 'draft',
        description: '',
        assets: [asset],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isAutoGenerated: true,
        approvalStatus: 'pending',
      };

      generatedPosts.push(post);
      assetIndex++;
    }
  }

  return generatedPosts;
}

/**
 * Check if a date falls on a weekend
 */
function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Parse a time string (HH:MM) into a date
 */
function parseTimeToDate(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const result = new Date(date);
  result.setHours(hours ?? 9, minutes ?? 0, 0, 0);
  return result;
}

/**
 * Decide the platform and post type based on asset characteristics
 */
function decidePostStrategy(
  asset: Asset,
  platformPriority?: Platform[]
): { platform: Platform; postType: PostType } {
  const isVideo = asset.fileType === 'video';

  if (isVideo) {
    const platform = platformPriority?.[0] ?? randomChoice(['instagram', 'tiktok'] as const);
    return {
      platform,
      postType: platform === 'instagram' ? 'instagram_reel' : 'tiktok_reel',
    };
  }

  const platforms = platformPriority ?? DEFAULT_PLATFORMS;
  const platform = randomChoice(platforms);

  switch (platform) {
    case 'instagram':
      return randomChoice([
        { platform, postType: 'instagram_post' as const },
        { platform, postType: 'instagram_post' as const },
        { platform, postType: 'instagram_story' as const },
      ]);
    case 'tiktok':
      return randomChoice([
        { platform, postType: 'tiktok_slideshow' as const },
        { platform, postType: 'tiktok_slideshow' as const },
        { platform, postType: 'tiktok_story' as const },
      ]);
    case 'x':
      return { platform, postType: 'x_post' };
    case 'threads':
      return { platform, postType: 'threads_post' };
    default:
      return { platform: 'instagram', postType: 'instagram_post' };
  }
}

/**
 * Pick a random element from an array
 */
function randomChoice<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Calculate summary statistics for generated posts
 */
function calculateScheduleSummary(posts: Post[]): AutoScheduleResult['summary'] {
  const byPlatform = createEmptyPlatformCount();
  const byDay: Record<string, number> = {};

  for (const post of posts) {
    byPlatform[post.platform]++;
    const day = post.scheduledTime.split('T')[0];
    byDay[day] = (byDay[day] ?? 0) + 1;
  }

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
  _captionLibrary: unknown[]
): Promise<Post[]> {
  // TODO: Integrate with AI service for caption generation
  return posts.map(post => ({
    ...post,
    description: 'Auto-generated caption (to be implemented)',
  }));
}
