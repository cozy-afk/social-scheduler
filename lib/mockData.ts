import { Model, User, Post, Caption, GalleryAsset, PostingFrequencyConfig, DailyPostingTarget, PostReference } from '@/types/models';
import { addDays, format } from 'date-fns';

const defaultTarget: DailyPostingTarget = { reels: 3, carousels: 1, stories: 2 };

const defaultFrequency: PostingFrequencyConfig[] = [
  { platform: 'instagram', enabled: true,  postsPerDay: 3, startHour: 8,  endHour: 21, postTypes: ['instagram_reel', 'instagram_post', 'instagram_story'] },
  { platform: 'tiktok',    enabled: true,  postsPerDay: 3, startHour: 9,  endHour: 21, postTypes: ['tiktok_reel', 'tiktok_slideshow'] },
  { platform: 'threads',   enabled: true,  postsPerDay: 1, startHour: 10, endHour: 18, postTypes: ['threads_post'] },
  { platform: 'x',         enabled: false, postsPerDay: 1, startHour: 9,  endHour: 17, postTypes: ['x_post'] },
];

const generateExifPreset = () => ({
  device: 'iPhone 16 Pro',
  model: 'iPhone17,1',
  lens: 'iPhone 16 Pro back triple camera 6.86mm f/1.78',
  software: 'iOS 18.2.1',
  gpsLatitude: 34.0522 + (Math.random() - 0.5) * 0.1,
  gpsLongitude: -118.2437 + (Math.random() - 0.5) * 0.1,
  isoVariance: [100, 200, 400, 800],
  focalLengthVariance: [6.86, 9.0, 24.0],
});

export const mockModels: Model[] = [
  {
    id: '1',
    name: 'Loki',
    profileImage: '🐺',
    agencyId: 'agency-1',
    fanvueAccountId: '',
    s3Folder: 'LOKI',
    exifPreset: generateExifPreset(),
    assignedVaIds: ['va-1'],
    postingFrequency: defaultFrequency,
    dailyTarget: { reels: 4, carousels: 1, stories: 3 },
    postingSchedule: [
      { id: '1',  time: '09:00', platform: 'instagram', postType: 'instagram_post',   recurrence: 'daily', contentType: 'carousel' },
      { id: '2',  time: '09:00', platform: 'instagram', postType: 'instagram_reel',   recurrence: 'daily', contentType: 'reel' },
      { id: '3',  time: '09:00', platform: 'tiktok',    postType: 'tiktok_reel',       recurrence: 'daily', contentType: 'reel' },
      { id: '4',  time: '09:00', platform: 'tiktok',    postType: 'tiktok_slideshow',  recurrence: 'daily', contentType: 'carousel' },
      { id: '5',  time: '09:00', platform: 'x',         postType: 'x_post',            recurrence: 'daily', contentType: 'post' },
      { id: '6',  time: '09:00', platform: 'threads',   postType: 'threads_post',      recurrence: 'daily', contentType: 'post' },
      { id: '7',  time: '13:00', platform: 'instagram', postType: 'instagram_reel',   recurrence: 'daily', contentType: 'reel' },
      { id: '8',  time: '13:00', platform: 'tiktok',    postType: 'tiktok_reel',       recurrence: 'daily', contentType: 'reel' },
      { id: '9',  time: '21:00', platform: 'instagram', postType: 'instagram_post',   recurrence: 'daily', contentType: 'carousel' },
      { id: '10', time: '21:00', platform: 'instagram', postType: 'instagram_reel',   recurrence: 'daily', contentType: 'reel' },
      { id: '11', time: '21:00', platform: 'tiktok',    postType: 'tiktok_slideshow',  recurrence: 'daily', contentType: 'carousel' },
      { id: '12', time: '21:00', platform: 'x',         postType: 'x_post',            recurrence: 'daily', contentType: 'post' },
    ],
    status: 'active',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Isla',
    profileImage: '🌊',
    agencyId: 'agency-1',
    fanvueAccountId: '',
    s3Folder: 'ISLA',
    exifPreset: generateExifPreset(),
    assignedVaIds: ['va-1'],
    postingFrequency: defaultFrequency,
    dailyTarget: { reels: 3, carousels: 2, stories: 3 },
    postingSchedule: [
      { id: 'i1', time: '08:00', platform: 'instagram', postType: 'instagram_reel',  recurrence: 'daily', contentType: 'reel' },
      { id: 'i2', time: '08:00', platform: 'tiktok',    postType: 'tiktok_reel',      recurrence: 'daily', contentType: 'reel' },
      { id: 'i3', time: '12:00', platform: 'instagram', postType: 'instagram_post',  recurrence: 'daily', contentType: 'carousel' },
      { id: 'i4', time: '12:00', platform: 'tiktok',    postType: 'tiktok_slideshow', recurrence: 'daily', contentType: 'carousel' },
      { id: 'i5', time: '19:00', platform: 'instagram', postType: 'instagram_reel',  recurrence: 'daily', contentType: 'reel' },
      { id: 'i6', time: '19:00', platform: 'x',         postType: 'x_post',           recurrence: 'daily', contentType: 'post' },
      { id: 'i7', time: '19:00', platform: 'threads',   postType: 'threads_post',     recurrence: 'daily', contentType: 'post' },
    ],
    status: 'active',
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Kyla',
    profileImage: '🌸',
    agencyId: 'agency-1',
    fanvueAccountId: '',
    s3Folder: 'KYLA',
    exifPreset: generateExifPreset(),
    assignedVaIds: ['va-2'],
    postingFrequency: defaultFrequency,
    dailyTarget: { reels: 4, carousels: 1, stories: 2 },
    postingSchedule: [
      { id: 'k1', time: '10:00', platform: 'instagram', postType: 'instagram_reel',  recurrence: 'daily', contentType: 'reel' },
      { id: 'k2', time: '10:00', platform: 'tiktok',    postType: 'tiktok_reel',      recurrence: 'daily', contentType: 'reel' },
      { id: 'k3', time: '14:00', platform: 'instagram', postType: 'instagram_post',  recurrence: 'daily', contentType: 'carousel' },
      { id: 'k4', time: '14:00', platform: 'tiktok',    postType: 'tiktok_reel',      recurrence: 'daily', contentType: 'reel' },
      { id: 'k5', time: '20:00', platform: 'instagram', postType: 'instagram_reel',  recurrence: 'daily', contentType: 'reel' },
      { id: 'k6', time: '20:00', platform: 'x',         postType: 'x_post',           recurrence: 'daily', contentType: 'post' },
    ],
    status: 'active',
    createdAt: new Date().toISOString(),
  },
  {
    id: '4',
    name: 'Celia',
    profileImage: '🦋',
    agencyId: 'agency-2',
    fanvueAccountId: '',
    s3Folder: 'CELIA',
    exifPreset: generateExifPreset(),
    assignedVaIds: [],
    postingFrequency: [
      { platform: 'instagram', enabled: true,  postsPerDay: 7, startHour: 9,  endHour: 21, postTypes: ['instagram_reel', 'instagram_post', 'instagram_story'] },
      { platform: 'tiktok',    enabled: true,  postsPerDay: 7, startHour: 9,  endHour: 21, postTypes: ['tiktok_reel', 'tiktok_slideshow', 'tiktok_story'] },
      { platform: 'threads',   enabled: true,  postsPerDay: 7, startHour: 9,  endHour: 21, postTypes: ['threads_post'] },
      { platform: 'x',         enabled: false, postsPerDay: 1, startHour: 9,  endHour: 17, postTypes: ['x_post'] },
    ],
    dailyTarget: { reels: 3, carousels: 1, stories: 3 },
    // Full posting schedule:
    // – 3 IG reels/day  (9am, 1pm, 9pm)
    // – 3 TikTok reels/day  (9am, 1pm, 9pm)
    // – 1 IG carousel/day  (11am, 2-3 images)
    // – 1 TikTok slideshow/day (11am)
    // – 7 Threads posts/day  (every ~2h)
    // – 3 IG stories/day  (10am, 3pm, 8pm)
    // – 3 TikTok stories/day  (10am, 3pm, 8pm)
    postingSchedule: [
      // ── Reels (3× per platform) ─────────────────────────────────────────
      { id: 'c1',  time: '09:00', platform: 'instagram', postType: 'instagram_reel',    recurrence: 'daily', contentType: 'reel' },
      { id: 'c2',  time: '09:00', platform: 'tiktok',    postType: 'tiktok_reel',        recurrence: 'daily', contentType: 'reel' },
      { id: 'c3',  time: '13:00', platform: 'instagram', postType: 'instagram_reel',    recurrence: 'daily', contentType: 'reel' },
      { id: 'c4',  time: '13:00', platform: 'tiktok',    postType: 'tiktok_reel',        recurrence: 'daily', contentType: 'reel' },
      { id: 'c5',  time: '21:00', platform: 'instagram', postType: 'instagram_reel',    recurrence: 'daily', contentType: 'reel' },
      { id: 'c6',  time: '21:00', platform: 'tiktok',    postType: 'tiktok_reel',        recurrence: 'daily', contentType: 'reel' },
      // ── Carousels (1× per platform) ────────────────────────────────────
      { id: 'c7',  time: '11:00', platform: 'instagram', postType: 'instagram_post',    recurrence: 'daily', contentType: 'carousel' },
      { id: 'c8',  time: '11:00', platform: 'tiktok',    postType: 'tiktok_slideshow',   recurrence: 'daily', contentType: 'carousel' },
      // ── Stories (3× per platform) ──────────────────────────────────────
      { id: 'c9',  time: '10:00', platform: 'instagram', postType: 'instagram_story',   recurrence: 'daily', contentType: 'story' },
      { id: 'c10', time: '15:00', platform: 'instagram', postType: 'instagram_story',   recurrence: 'daily', contentType: 'story' },
      { id: 'c11', time: '20:00', platform: 'instagram', postType: 'instagram_story',   recurrence: 'daily', contentType: 'story' },
      { id: 'c12', time: '10:00', platform: 'tiktok',    postType: 'tiktok_story',       recurrence: 'daily', contentType: 'story' },
      { id: 'c13', time: '15:00', platform: 'tiktok',    postType: 'tiktok_story',       recurrence: 'daily', contentType: 'story' },
      { id: 'c14', time: '20:00', platform: 'tiktok',    postType: 'tiktok_story',       recurrence: 'daily', contentType: 'story' },
      // ── Threads (7× per day, every ~2h) ────────────────────────────────
      { id: 'c15', time: '09:00', platform: 'threads',   postType: 'threads_post',       recurrence: 'daily', contentType: 'post' },
      { id: 'c16', time: '10:30', platform: 'threads',   postType: 'threads_post',       recurrence: 'daily', contentType: 'post' },
      { id: 'c17', time: '12:00', platform: 'threads',   postType: 'threads_post',       recurrence: 'daily', contentType: 'post' },
      { id: 'c18', time: '13:30', platform: 'threads',   postType: 'threads_post',       recurrence: 'daily', contentType: 'post' },
      { id: 'c19', time: '15:00', platform: 'threads',   postType: 'threads_post',       recurrence: 'daily', contentType: 'post' },
      { id: 'c20', time: '18:00', platform: 'threads',   postType: 'threads_post',       recurrence: 'daily', contentType: 'post' },
      { id: 'c21', time: '21:00', platform: 'threads',   postType: 'threads_post',       recurrence: 'daily', contentType: 'post' },
    ],
    status: 'active',
    createdAt: new Date().toISOString(),
  },
  {
    id: '5',
    name: 'Sofia',
    profileImage: '🌺',
    agencyId: 'agency-2',
    fanvueAccountId: '',
    s3Folder: 'SOFIA',
    exifPreset: generateExifPreset(),
    assignedVaIds: ['va-3'],
    postingFrequency: defaultFrequency,
    dailyTarget: { reels: 5, carousels: 1, stories: 3 },
    postingSchedule: [
      { id: 's1', time: '08:00', platform: 'instagram', postType: 'instagram_reel',  recurrence: 'daily', contentType: 'reel' },
      { id: 's2', time: '08:00', platform: 'tiktok',    postType: 'tiktok_reel',      recurrence: 'daily', contentType: 'reel' },
      { id: 's3', time: '12:00', platform: 'instagram', postType: 'instagram_post',  recurrence: 'daily', contentType: 'carousel' },
      { id: 's4', time: '12:00', platform: 'tiktok',    postType: 'tiktok_slideshow', recurrence: 'daily', contentType: 'carousel' },
      { id: 's5', time: '17:00', platform: 'instagram', postType: 'instagram_reel',  recurrence: 'daily', contentType: 'reel' },
      { id: 's6', time: '17:00', platform: 'x',         postType: 'x_post',           recurrence: 'daily', contentType: 'post' },
      { id: 's7', time: '22:00', platform: 'instagram', postType: 'instagram_reel',  recurrence: 'daily', contentType: 'reel' },
      { id: 's8', time: '22:00', platform: 'threads',   postType: 'threads_post',     recurrence: 'daily', contentType: 'post' },
    ],
    status: 'active',
    createdAt: new Date().toISOString(),
  },
];

export const mockAdmin: User = {
  id: 'admin-1',
  email: 'admin@example.com',
  name: 'Admin User',
  role: 'admin',
  assignedModels: ['1', '2', '3'],
};

// Agency 1 users
export const mockAgency1User: User = {
  id: 'agency-1-user',
  email: 'agency1@example.com',
  name: 'Apex Admin',
  role: 'agency',
  agencyId: 'agency-1',
  assignedModels: [],
};

// Agency 2 users
export const mockAgency2User: User = {
  id: 'agency-2-user',
  email: 'agency2@example.com',
  name: 'Stellar Admin',
  role: 'agency',
  agencyId: 'agency-2',
  assignedModels: [],
};

export const mockVA: User = {
  id: 'va-1',
  email: 'va1@example.com',
  name: 'Alex Turner',
  role: 'va',
  assignedModels: ['1', '2'],
};

export const mockVAUsers: User[] = [
  { id: 'va-1', email: 'va1@example.com', name: 'Alex Turner',  role: 'va', assignedModels: ['1', '2'] },
  { id: 'va-2', email: 'va2@example.com', name: 'Jordan Lee',   role: 'va', assignedModels: ['2', '3'] },
  { id: 'va-3', email: 'va3@example.com', name: 'Casey Morgan', role: 'va', assignedModels: [] },
];

// ─── Users with Discord OAuth Data ─────────────────────────────────────

export const mockUsersWithDiscord: User[] = [
  {
    id: 'discord-admin-1',
    email: 'admin@socialscheduler.com',
    name: 'System Admin',
    role: 'admin',
    assignedModels: [],
    discordId: '123456789012345678',
    approvalStatus: 'approved',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'discord-agency-1',
    email: 'apex@agency.com',
    name: 'Apex Admin',
    role: 'agency',
    agencyId: 'agency-1',
    assignedModels: [],
    discordId: '234567890123456789',
    approvalStatus: 'approved',
    createdAt: '2024-01-15T00:00:00Z',
  },
  {
    id: 'discord-agency-2',
    email: 'stellar@agency.com',
    name: 'Stellar Admin',
    role: 'agency',
    agencyId: 'agency-2',
    assignedModels: [],
    discordId: '345678901234567890',
    approvalStatus: 'approved',
    createdAt: '2024-01-15T00:00:00Z',
  },
  {
    id: 'discord-pending-1',
    email: 'newuser@example.com',
    name: 'Pending User',
    role: 'agency',
    assignedModels: [],
    discordId: '456789012345678901',
    approvalStatus: 'pending',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'discord-denied-1',
    email: 'denied@example.com',
    name: 'Denied User',
    role: 'agency',
    assignedModels: [],
    discordId: '567890123456789012',
    approvalStatus: 'denied',
    createdAt: '2024-02-01T00:00:00Z',
  },
  {
    id: 'discord-planner-1',
    email: 'planner@apex.com',
    name: 'Content Planner',
    role: 'planner',
    agencyId: 'agency-1',
    assignedModels: ['1', '2'],
    discordId: '678901234567890123',
    approvalStatus: 'approved',
    createdAt: '2024-01-20T00:00:00Z',
  },
];

// Generate posts for today + next 6 days for Emma Rose
const today = new Date();
const generatePostsForDay = (date: Date, modelId: string, partial = false): Post[] => {
  const dateStr = format(date, 'yyyy-MM-dd');
  const slots = modelId === '1' ? [
    { time: '09:00', platform: 'instagram' as const, postType: 'instagram_post' as const },
    { time: '09:00', platform: 'instagram' as const, postType: 'instagram_reel' as const },
    { time: '09:00', platform: 'tiktok' as const,    postType: 'tiktok_reel' as const },
    { time: '13:00', platform: 'instagram' as const, postType: 'instagram_reel' as const },
    { time: '21:00', platform: 'tiktok' as const,    postType: 'tiktok_slideshow' as const },
  ] : [];

  const fillCount = partial ? Math.floor(slots.length * 0.5) : slots.length;
  return slots.slice(0, fillCount).map((slot, idx) => ({
    id: `post-${dateStr}-${idx}`,
    modelId,
    platform: slot.platform,
    postType: slot.postType,
    scheduledTime: `${dateStr}T${slot.time}:00`,
    status: 'scheduled' as const,
    description: 'Scheduled post 🔥',
    assets: [{ id: `asset-${dateStr}-${idx}`, postId: `post-${dateStr}-${idx}`, fileUrl: '/demo-image.jpg', fileName: 'photo.jpg', fileType: 'image' as const, order: 1 }],
    assignedVaId: 'va-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
};

// ─── Celia Gallery Assets ─────────────────────────────────────────────────────
// 3 base videos (9:16 reels) + 8 images (carousels + threads)
// fileUrl uses /demo-* placeholders; real URLs come from R2 at runtime.

export const mockCeliaGalleryAssets: GalleryAsset[] = [
  // Videos — 9:16 (reels)
  { id: 'celia-vid-1', fileName: 'reel_outdoor.mp4',  fileUrl: '/demo-video.mp4', thumbnailUrl: '/demo-image.jpg', fileType: 'video', aspectRatio: 0.5625, width: 1080, height: 1920, source: 's3', s3Key: '[MODELS]/CELIA/reel_outdoor.mp4',  uploadedAt: new Date().toISOString() },
  { id: 'celia-vid-2', fileName: 'reel_bedroom.mp4',  fileUrl: '/demo-video.mp4', thumbnailUrl: '/demo-image.jpg', fileType: 'video', aspectRatio: 0.5625, width: 1080, height: 1920, source: 's3', s3Key: '[MODELS]/CELIA/reel_bedroom.mp4',  uploadedAt: new Date().toISOString() },
  { id: 'celia-vid-3', fileName: 'reel_studio.mp4',   fileUrl: '/demo-video.mp4', thumbnailUrl: '/demo-image.jpg', fileType: 'video', aspectRatio: 0.5625, width: 1080, height: 1920, source: 's3', s3Key: '[MODELS]/CELIA/reel_studio.mp4',   uploadedAt: new Date().toISOString() },
  // Images — square (1:1) and portrait (4:5) for carousels + threads
  { id: 'celia-img-1', fileName: 'photo_beach_1.jpg', fileUrl: '/demo-image.jpg', fileType: 'image', aspectRatio: 1.0,    width: 1080, height: 1080, source: 's3', s3Key: '[MODELS]/CELIA/photo_beach_1.jpg', uploadedAt: new Date().toISOString() },
  { id: 'celia-img-2', fileName: 'photo_beach_2.jpg', fileUrl: '/demo-image.jpg', fileType: 'image', aspectRatio: 1.0,    width: 1080, height: 1080, source: 's3', s3Key: '[MODELS]/CELIA/photo_beach_2.jpg', uploadedAt: new Date().toISOString() },
  { id: 'celia-img-3', fileName: 'photo_beach_3.jpg', fileUrl: '/demo-image.jpg', fileType: 'image', aspectRatio: 1.0,    width: 1080, height: 1080, source: 's3', s3Key: '[MODELS]/CELIA/photo_beach_3.jpg', uploadedAt: new Date().toISOString() },
  { id: 'celia-img-4', fileName: 'photo_mirror_1.jpg',fileUrl: '/demo-image.jpg', fileType: 'image', aspectRatio: 0.8,    width: 1080, height: 1350, source: 's3', s3Key: '[MODELS]/CELIA/photo_mirror_1.jpg',uploadedAt: new Date().toISOString() },
  { id: 'celia-img-5', fileName: 'photo_mirror_2.jpg',fileUrl: '/demo-image.jpg', fileType: 'image', aspectRatio: 0.8,    width: 1080, height: 1350, source: 's3', s3Key: '[MODELS]/CELIA/photo_mirror_2.jpg',uploadedAt: new Date().toISOString() },
  { id: 'celia-img-6', fileName: 'photo_outfit_1.jpg',fileUrl: '/demo-image.jpg', fileType: 'image', aspectRatio: 0.8,    width: 1080, height: 1350, source: 's3', s3Key: '[MODELS]/CELIA/photo_outfit_1.jpg',uploadedAt: new Date().toISOString() },
  { id: 'celia-img-7', fileName: 'photo_outfit_2.jpg',fileUrl: '/demo-image.jpg', fileType: 'image', aspectRatio: 0.8,    width: 1080, height: 1350, source: 's3', s3Key: '[MODELS]/CELIA/photo_outfit_2.jpg',uploadedAt: new Date().toISOString() },
  { id: 'celia-img-8', fileName: 'photo_couch_1.jpg', fileUrl: '/demo-image.jpg', fileType: 'image', aspectRatio: 1.0,    width: 1080, height: 1080, source: 's3', s3Key: '[MODELS]/CELIA/photo_couch_1.jpg', uploadedAt: new Date().toISOString() },
];

// IDs of Celia's assets that are "approved" (ready to schedule)
export const mockCeliaApprovedAssetIds = mockCeliaGalleryAssets.map((a) => a.id);

// ─── Celia Post Generator ─────────────────────────────────────────────────────

const CELIA_REEL_CAPTIONS = [
  'not everyone gets to see this 🔒 link in bio',
  'your daily reminder 💌',
  'POV: you found your new fav page 👀✨',
  'that girl era 💅 new drop is live',
  'this is what winning looks like 🏆',
  'tell me why I keep coming back ✨',
  'not for everyone 🫦 you know where to find me',
  'woke up and chose chaos 😈',
  'the ones who stick around see everything 🔥',
  'daily content for the ones who appreciate it 💫',
  'new week new content 🦋 link in bio',
  'saving the best for my page 😏',
  'some things are better seen than said 👁',
  'your tuesday treat 🎁 link in bio',
  'wait til you see what I posted today 🫢',
  'different mood today 🌙 check the link',
  'for the ones who showed up today 💜',
  'this one hits different 🎧',
  'new morning new content 🌅',
  'I see you lurking — just subscribe already 🥹',
  'friday feels 🔥 link in bio',
];

const CELIA_THREADS_CAPTIONS = [
  'morning vibes ☀️ what are you all doing today?',
  'reminder: you deserve good things 💜',
  'new content just dropped — you already know where 🔗',
  'feeling cute might post more later',
  'woke up and chose peace today 🌿',
  'who else is having a slow morning? ☕',
  'your daily affirmation: you are that girl 💅',
  'honestly the best part of my day is posting for you all',
  'question: morning person or night owl? I\'m definitely the second 🌙',
  'dropping something later tonight 👀',
  'random thought: butterflies in your stomach are just your gut being excited',
  'today\'s mood: unbothered 🧘‍♀️',
  'appreciate every person who\'s been here since day 1 💜',
  'the link in bio literally pays my rent and I\'m not ashamed 😭',
  'plot twist: the best content is behind the paywall 😈',
  'sometimes I forget to eat when I\'m creating content lol',
  'new week energy ✨ let\'s go',
  'Wednesday check-in: are you hydrated? drink water babes 💧',
  'I love my job I love my job I love my job 🦋',
  'grateful for every single one of you fr',
  'late night thoughts: it\'s crazy how far we\'ve come',
  'posting from my bed because why would I get up 🛏️',
];

const CELIA_STORY_CAPTIONS = [
  '🦋 swipe up', 'new post up ↗️', 'link in bio ✨',
  'just posted 👆', 'good morning 🌅', 'good night 🌙',
  'behind the scenes 🎬', 'vibes only ✨', 'for you 💜',
];

const CELIA_CAROUSEL_CAPTIONS = [
  { caption: 'swipe to see more 🦋', description: 'New set just dropped — all of these + way more on my page 💜 Link in bio for the full album 🔗' },
  { caption: 'pick your favorite 💜', description: 'Which one is your favorite? Let me know in the comments 👇 Full set available on my page 🔗' },
  { caption: 'a little something for your feed ✨', description: 'Starting this week right 🌟 New content up on my page, you know where to find me 💌' },
  { caption: 'the full set is on my page 😏', description: 'Teaser only here 😈 You want the rest? Link in bio 🔗 I post every single day for my subscribers 💜' },
  { caption: 'outfit check 🦋', description: 'Which look is your favorite? Saving the best ones for my page as always 💅 Link in bio!' },
  { caption: 'morning set ☀️', description: 'Good morning babes! New content up — drop in and say hi 🌸 Link in bio 🔗' },
  { caption: 'week recap 🎬', description: 'A little recap of this week\'s content 🌟 Full library on my page, new drops daily 💜' },
];

// Rotating video assignments — 3 different videos within the same day, same video OK across days
const DAILY_VIDEO_ORDER = [
  ['celia-vid-1', 'celia-vid-2', 'celia-vid-3'], // day 0 (today)
  ['celia-vid-2', 'celia-vid-3', 'celia-vid-1'], // day 1
  ['celia-vid-3', 'celia-vid-1', 'celia-vid-2'], // day 2
  ['celia-vid-1', 'celia-vid-3', 'celia-vid-2'], // day 3
  ['celia-vid-2', 'celia-vid-1', 'celia-vid-3'], // day 4
  ['celia-vid-3', 'celia-vid-2', 'celia-vid-1'], // day 5
  ['celia-vid-1', 'celia-vid-2', 'celia-vid-3'], // day 6
];

// Carousel image groupings — alternating 2-image and 3-image
const CAROUSEL_GROUPS = [
  ['celia-img-1', 'celia-img-2'],                     // 2-image
  ['celia-img-4', 'celia-img-5', 'celia-img-6'],      // 3-image
  ['celia-img-2', 'celia-img-3'],                     // 2-image
  ['celia-img-6', 'celia-img-7', 'celia-img-8'],      // 3-image
  ['celia-img-1', 'celia-img-4'],                     // 2-image
  ['celia-img-3', 'celia-img-5', 'celia-img-7'],      // 3-image
  ['celia-img-2', 'celia-img-8'],                     // 2-image
];

function makeCeliaPostsForDay(date: Date, dayIndex: number): Post[] {
  const ds = format(date, 'yyyy-MM-dd');
  const videos = DAILY_VIDEO_ORDER[dayIndex % 7];
  const carouselImgIds = CAROUSEL_GROUPS[dayIndex % 7];

  const makeAsset = (postId: string, assetId: string, order: number): Post['assets'][0] => {
    const galAsset = mockCeliaGalleryAssets.find((a) => a.id === assetId);
    return {
      id: `${postId}-a${order}`,
      postId,
      fileUrl: galAsset?.fileUrl ?? '/demo-image.jpg',
      fileName: galAsset?.fileName ?? 'asset.jpg',
      fileType: galAsset?.fileType ?? 'image',
      order,
    };
  };

  const posts: Post[] = [];
  let pi = 0; // post index for unique IDs

  // ── IG Reel 1 (9:00) — video[0]
  const ir1Id = `celia-${ds}-ig-r1`;
  posts.push({ id: ir1Id, modelId: '4', platform: 'instagram', postType: 'instagram_reel', scheduledTime: `${ds}T09:00:00`, status: 'scheduled', description: CELIA_REEL_CAPTIONS[(dayIndex * 3 + 0) % CELIA_REEL_CAPTIONS.length], assets: [makeAsset(ir1Id, videos[0], 0)], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

  // ── TikTok Reel 1 (9:00) — video[0]
  const tr1Id = `celia-${ds}-tt-r1`;
  posts.push({ id: tr1Id, modelId: '4', platform: 'tiktok', postType: 'tiktok_reel', scheduledTime: `${ds}T09:00:00`, status: 'scheduled', description: CELIA_REEL_CAPTIONS[(dayIndex * 3 + 1) % CELIA_REEL_CAPTIONS.length], assets: [makeAsset(tr1Id, videos[0], 0)], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

  // ── IG Story 1 (10:00)
  const is1Id = `celia-${ds}-ig-s1`;
  posts.push({ id: is1Id, modelId: '4', platform: 'instagram', postType: 'instagram_story', scheduledTime: `${ds}T10:00:00`, status: 'scheduled', description: CELIA_STORY_CAPTIONS[dayIndex % CELIA_STORY_CAPTIONS.length], assets: [makeAsset(is1Id, videos[0], 0)], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

  // ── TikTok Story 1 (10:00)
  const ts1Id = `celia-${ds}-tt-s1`;
  posts.push({ id: ts1Id, modelId: '4', platform: 'tiktok', postType: 'tiktok_story', scheduledTime: `${ds}T10:00:00`, status: 'scheduled', description: CELIA_STORY_CAPTIONS[(dayIndex + 1) % CELIA_STORY_CAPTIONS.length], assets: [makeAsset(ts1Id, videos[1], 0)], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

  // ── IG Carousel (11:00) — 2 or 3 images
  const icId = `celia-${ds}-ig-c`;
  const carouselCap = CELIA_CAROUSEL_CAPTIONS[dayIndex % CELIA_CAROUSEL_CAPTIONS.length];
  posts.push({ id: icId, modelId: '4', platform: 'instagram', postType: 'instagram_post', scheduledTime: `${ds}T11:00:00`, status: 'scheduled', description: carouselCap.description, imageCaption: carouselCap.caption, assets: carouselImgIds.map((aid, i) => makeAsset(icId, aid, i)), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

  // ── TikTok Slideshow (11:00) — same images
  const tcId = `celia-${ds}-tt-c`;
  posts.push({ id: tcId, modelId: '4', platform: 'tiktok', postType: 'tiktok_slideshow', scheduledTime: `${ds}T11:00:00`, status: 'scheduled', description: carouselCap.description, imageCaption: carouselCap.caption, assets: carouselImgIds.map((aid, i) => makeAsset(tcId, aid, i)), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

  // ── Threads post 1 (9:00)
  const th1Id = `celia-${ds}-th-1`;
  posts.push({ id: th1Id, modelId: '4', platform: 'threads', postType: 'threads_post', scheduledTime: `${ds}T09:00:00`, status: 'scheduled', description: CELIA_THREADS_CAPTIONS[(dayIndex * 7 + 0) % CELIA_THREADS_CAPTIONS.length], assets: [makeAsset(th1Id, 'celia-img-1', 0)], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

  // ── Threads post 2 (10:30) — 2 images
  const th2Id = `celia-${ds}-th-2`;
  posts.push({ id: th2Id, modelId: '4', platform: 'threads', postType: 'threads_post', scheduledTime: `${ds}T10:30:00`, status: 'scheduled', description: CELIA_THREADS_CAPTIONS[(dayIndex * 7 + 1) % CELIA_THREADS_CAPTIONS.length], assets: [makeAsset(th2Id, 'celia-img-2', 0), makeAsset(th2Id, 'celia-img-3', 1)], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

  // ── IG Reel 2 (13:00) — video[1]
  const ir2Id = `celia-${ds}-ig-r2`;
  posts.push({ id: ir2Id, modelId: '4', platform: 'instagram', postType: 'instagram_reel', scheduledTime: `${ds}T13:00:00`, status: 'scheduled', description: CELIA_REEL_CAPTIONS[(dayIndex * 3 + 2) % CELIA_REEL_CAPTIONS.length], assets: [makeAsset(ir2Id, videos[1], 0)], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

  // ── TikTok Reel 2 (13:00) — video[1]
  const tr2Id = `celia-${ds}-tt-r2`;
  posts.push({ id: tr2Id, modelId: '4', platform: 'tiktok', postType: 'tiktok_reel', scheduledTime: `${ds}T13:00:00`, status: 'scheduled', description: CELIA_REEL_CAPTIONS[(dayIndex * 3 + 3) % CELIA_REEL_CAPTIONS.length], assets: [makeAsset(tr2Id, videos[1], 0)], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

  // ── Threads post 3 (12:00)
  const th3Id = `celia-${ds}-th-3`;
  posts.push({ id: th3Id, modelId: '4', platform: 'threads', postType: 'threads_post', scheduledTime: `${ds}T12:00:00`, status: 'scheduled', description: CELIA_THREADS_CAPTIONS[(dayIndex * 7 + 2) % CELIA_THREADS_CAPTIONS.length], assets: [makeAsset(th3Id, 'celia-img-4', 0)], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

  // ── Threads post 4 (13:30) — 2 images
  const th4Id = `celia-${ds}-th-4`;
  posts.push({ id: th4Id, modelId: '4', platform: 'threads', postType: 'threads_post', scheduledTime: `${ds}T13:30:00`, status: 'scheduled', description: CELIA_THREADS_CAPTIONS[(dayIndex * 7 + 3) % CELIA_THREADS_CAPTIONS.length], assets: [makeAsset(th4Id, 'celia-img-5', 0), makeAsset(th4Id, 'celia-img-6', 1)], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

  // ── IG Story 2 (15:00)
  const is2Id = `celia-${ds}-ig-s2`;
  posts.push({ id: is2Id, modelId: '4', platform: 'instagram', postType: 'instagram_story', scheduledTime: `${ds}T15:00:00`, status: 'scheduled', description: CELIA_STORY_CAPTIONS[(dayIndex + 2) % CELIA_STORY_CAPTIONS.length], assets: [makeAsset(is2Id, carouselImgIds[0], 0)], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

  // ── TikTok Story 2 (15:00)
  const ts2Id = `celia-${ds}-tt-s2`;
  posts.push({ id: ts2Id, modelId: '4', platform: 'tiktok', postType: 'tiktok_story', scheduledTime: `${ds}T15:00:00`, status: 'scheduled', description: CELIA_STORY_CAPTIONS[(dayIndex + 3) % CELIA_STORY_CAPTIONS.length], assets: [makeAsset(ts2Id, videos[2], 0)], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

  // ── Threads post 5 (15:00)
  const th5Id = `celia-${ds}-th-5`;
  posts.push({ id: th5Id, modelId: '4', platform: 'threads', postType: 'threads_post', scheduledTime: `${ds}T15:00:00`, status: 'scheduled', description: CELIA_THREADS_CAPTIONS[(dayIndex * 7 + 4) % CELIA_THREADS_CAPTIONS.length], assets: [makeAsset(th5Id, 'celia-img-7', 0)], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

  // ── Threads post 6 (18:00) — 2 images
  const th6Id = `celia-${ds}-th-6`;
  posts.push({ id: th6Id, modelId: '4', platform: 'threads', postType: 'threads_post', scheduledTime: `${ds}T18:00:00`, status: 'scheduled', description: CELIA_THREADS_CAPTIONS[(dayIndex * 7 + 5) % CELIA_THREADS_CAPTIONS.length], assets: [makeAsset(th6Id, 'celia-img-8', 0), makeAsset(th6Id, 'celia-img-1', 1)], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

  // ── IG Story 3 (20:00)
  const is3Id = `celia-${ds}-ig-s3`;
  posts.push({ id: is3Id, modelId: '4', platform: 'instagram', postType: 'instagram_story', scheduledTime: `${ds}T20:00:00`, status: 'scheduled', description: CELIA_STORY_CAPTIONS[(dayIndex + 4) % CELIA_STORY_CAPTIONS.length], assets: [makeAsset(is3Id, carouselImgIds[carouselImgIds.length - 1], 0)], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

  // ── TikTok Story 3 (20:00)
  const ts3Id = `celia-${ds}-tt-s3`;
  posts.push({ id: ts3Id, modelId: '4', platform: 'tiktok', postType: 'tiktok_story', scheduledTime: `${ds}T20:00:00`, status: 'scheduled', description: CELIA_STORY_CAPTIONS[(dayIndex + 5) % CELIA_STORY_CAPTIONS.length], assets: [makeAsset(ts3Id, videos[2], 0)], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

  // ── IG Reel 3 (21:00) — video[2]
  const ir3Id = `celia-${ds}-ig-r3`;
  posts.push({ id: ir3Id, modelId: '4', platform: 'instagram', postType: 'instagram_reel', scheduledTime: `${ds}T21:00:00`, status: 'scheduled', description: CELIA_REEL_CAPTIONS[(dayIndex * 3 + 4) % CELIA_REEL_CAPTIONS.length], assets: [makeAsset(ir3Id, videos[2], 0)], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

  // ── TikTok Reel 3 (21:00) — video[2]
  const tr3Id = `celia-${ds}-tt-r3`;
  posts.push({ id: tr3Id, modelId: '4', platform: 'tiktok', postType: 'tiktok_reel', scheduledTime: `${ds}T21:00:00`, status: 'scheduled', description: CELIA_REEL_CAPTIONS[(dayIndex * 3 + 5) % CELIA_REEL_CAPTIONS.length], assets: [makeAsset(tr3Id, videos[2], 0)], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

  // ── Threads post 7 (21:00)
  const th7Id = `celia-${ds}-th-7`;
  posts.push({ id: th7Id, modelId: '4', platform: 'threads', postType: 'threads_post', scheduledTime: `${ds}T21:00:00`, status: 'scheduled', description: CELIA_THREADS_CAPTIONS[(dayIndex * 7 + 6) % CELIA_THREADS_CAPTIONS.length], assets: [makeAsset(th7Id, 'celia-img-2', 0)], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

  return posts;
}

// Generate 7 days of Celia posts (today through today+6)
export const mockCeliaPosts: Post[] = Array.from({ length: 7 }, (_, i) =>
  makeCeliaPostsForDay(addDays(new Date(), i), i)
).flat();

export const mockPosts: Post[] = [
  // Today - manually specified posts
  {
    id: 'post-1',
    modelId: '1',
    platform: 'instagram',
    postType: 'instagram_post',
    scheduledTime: new Date(today.setHours(9, 0, 0, 0)).toISOString(),
    status: 'scheduled',
    description: 'New content dropping 💎',
    imageCaption: 'Catch me if you can ✨',
    assets: [
      { id: 'asset-1', postId: 'post-1', fileUrl: '/demo-image.jpg', fileName: 'photo1.jpg', fileType: 'image', order: 1 },
      { id: 'asset-2', postId: 'post-1', fileUrl: '/demo-image.jpg', fileName: 'photo2.jpg', fileType: 'image', order: 2 },
      { id: 'asset-3', postId: 'post-1', fileUrl: '/demo-image.jpg', fileName: 'photo3.jpg', fileType: 'image', order: 3 },
    ],
    assignedVaId: 'va-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'post-2',
    modelId: '1',
    platform: 'instagram',
    postType: 'instagram_reel',
    scheduledTime: new Date(new Date().setHours(9, 0, 0, 0)).toISOString(),
    status: 'scheduled',
    description: 'Check this out 🔥',
    assets: [
      { id: 'asset-4', postId: 'post-2', fileUrl: '/demo-video.mp4', fileName: 'reel.mp4', fileType: 'video', order: 1 },
    ],
    assignedVaId: 'va-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'post-3',
    modelId: '1',
    platform: 'tiktok',
    postType: 'tiktok_slideshow',
    scheduledTime: new Date(new Date().setHours(21, 0, 0, 0)).toISOString(),
    status: 'scheduled',
    description: 'Swipe to see more ➡️',
    imageCaption: 'Slide 1 ✨',
    assets: [
      {
        id: 'asset-5', postId: 'post-3', fileUrl: '/demo-image.jpg', fileName: 'slide1.jpg', fileType: 'image', order: 1,
        overlayConfig: { text: 'Slide 1 ✨', position: { x: 50, y: 50 }, fontSize: 24, fontFamily: 'Arial', color: '#ffffff' },
      },
    ],
    assignedVaId: 'va-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  // Next 4 days - partial schedule to show weekly view realism
  ...generatePostsForDay(addDays(new Date(), 1), '1', true),
  ...generatePostsForDay(addDays(new Date(), 2), '1', false),
  ...generatePostsForDay(addDays(new Date(), 3), '1', true),
  ...generatePostsForDay(addDays(new Date(), 4), '1', false),
];

export const mockCaptions: Caption[] = [
  { id: 'cap-1',  category: 'ig_reels',        platform: 'instagram', postType: 'instagram_reel',   text: 'Check this out 🔥',                                                performanceRating: 'high',   tags: ['casual', 'emoji'],       createdAt: new Date().toISOString() },
  { id: 'cap-2',  category: 'ig_reels',        platform: 'instagram', postType: 'instagram_reel',   text: 'POV: you found your new favorite page 👀✨',                        performanceRating: 'high',   tags: ['pov', 'engagement'],     createdAt: new Date().toISOString() },
  { id: 'cap-3',  category: 'ig_reels',        platform: 'instagram', postType: 'instagram_reel',   text: 'That girl era 💅 New content is live, link in bio 🔗',             performanceRating: 'high',   tags: ['lifestyle', 'cta'],      createdAt: new Date().toISOString() },
  { id: 'cap-4',  category: 'ig_post',         platform: 'instagram', postType: 'instagram_post',   text: 'New content dropping 💎',                                          performanceRating: 'high',   tags: ['promotional', 'short'],  createdAt: new Date().toISOString() },
  { id: 'cap-5',  category: 'ig_post',         platform: 'instagram', postType: 'instagram_post',   text: 'New post alert 💫',                                               performanceRating: 'high',   tags: ['short', 'emoji'],        createdAt: new Date().toISOString() },
  { id: 'cap-6',  category: 'ig_post',         platform: 'instagram', postType: 'instagram_post',   text: 'Obsessed with this look lately 🖤 What do you think?',            performanceRating: 'medium', tags: ['engagement', 'question'], createdAt: new Date().toISOString() },
  { id: 'cap-7',  category: 'tiktok_slideshow', platform: 'tiktok',   postType: 'tiktok_slideshow', text: 'Swipe to see more ➡️',                                            performanceRating: 'high',   tags: ['engagement', 'cta'],     createdAt: new Date().toISOString() },
  { id: 'cap-8',  category: 'tiktok_slideshow', platform: 'tiktok',   postType: 'tiktok_slideshow', text: 'Part 1 of 5 🔥 keep swiping',                                     performanceRating: 'high',   tags: ['series', 'engagement'],  createdAt: new Date().toISOString() },
  { id: 'cap-9',  category: 'tiktok_slideshow', platform: 'tiktok',   postType: 'tiktok_slideshow', text: 'Wait for the last slide 👀',                                      performanceRating: 'high',   tags: ['teaser', 'emoji'],       createdAt: new Date().toISOString() },
  { id: 'cap-10', category: 'tiktok_reel',     platform: 'tiktok',   postType: 'tiktok_reel',       text: "Tell me you're obsessed without telling me 🤭",                   performanceRating: 'high',   tags: ['trend', 'engagement'],   createdAt: new Date().toISOString() },
  { id: 'cap-11', category: 'tiktok_reel',     platform: 'tiktok',   postType: 'tiktok_reel',       text: "This one's for my supporters 💙 you know who you are",            performanceRating: 'high',   tags: ['appreciation', 'emoji'], createdAt: new Date().toISOString() },
  { id: 'cap-12', category: 'threads_post',    platform: 'threads',  postType: 'threads_post',      text: 'Dropped something special today. Check the link 🔗',              performanceRating: 'high',   tags: ['promotional', 'cta'],    createdAt: new Date().toISOString() },
  { id: 'cap-13', category: 'threads_post',    platform: 'threads',  postType: 'threads_post',      text: 'Real ones already know what this means 😏 New post is up.',       performanceRating: 'high',   tags: ['community', 'teaser'],   createdAt: new Date().toISOString() },
  { id: 'cap-14', category: 'threads_post',    platform: 'threads',  postType: 'threads_post',      text: 'Mondays hit different when you have something to look forward to 💙', performanceRating: 'medium', tags: ['lifestyle', 'casual'],  createdAt: new Date().toISOString() },
  { id: 'cap-15', category: 'x_post',          platform: 'x',        postType: 'x_post',            text: "Just posted something special on my page. You don't want to miss this one 👀", performanceRating: 'medium', tags: ['promotional'], createdAt: new Date().toISOString() },
  { id: 'cap-16', category: 'x_post',          platform: 'x',        postType: 'x_post',            text: 'New content is live 🔥 link in bio for the full thing',           performanceRating: 'high',   tags: ['cta', 'short'],          createdAt: new Date().toISOString() },
];

// ─── Mock Post References (caption overlay library) ───────────────────────────

export const mockPostReferences: PostReference[] = [
  {
    id: 'ref-1',
    coverImageUrl: null,
    caption: 'a few backshots never hurt a friendship',
    description: 'New content dropping tonight 💋 link in bio',
    imageCaption: 'a few backshots never hurt a friendship',
    sourcePlatform: 'tiktok',
    category: 'tiktok_reel',
    tags: ['hook', 'suggestive', 'punchy'],
    performanceRating: 'high',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ref-2',
    coverImageUrl: null,
    caption: 'she said be yourself so I did',
    description: 'Just being me 🤷‍♀️ full set on my page',
    imageCaption: 'she said be yourself so I did',
    sourcePlatform: 'tiktok',
    category: 'tiktok_reel',
    tags: ['hook', 'relatable', 'punchy'],
    performanceRating: 'high',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ref-3',
    coverImageUrl: null,
    caption: 'POV: you finally found my page',
    description: 'Welcome 👀 new content dropping weekly',
    imageCaption: 'POV: you finally found my page',
    sourcePlatform: 'tiktok',
    category: 'tiktok_reel',
    tags: ['pov', 'hook', 'engagement'],
    performanceRating: 'high',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ref-4',
    coverImageUrl: null,
    caption: 'tell me you\'re obsessed without telling me',
    description: 'You already know 🔥',
    imageCaption: 'tell me you\'re obsessed without telling me',
    sourcePlatform: 'tiktok',
    category: 'tiktok_reel',
    tags: ['trend', 'hook', 'engagement'],
    performanceRating: 'high',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ref-5',
    coverImageUrl: null,
    caption: 'just a little treat for my supporters',
    description: 'You deserve this one 💙 check my page',
    imageCaption: 'just a little treat for my supporters',
    sourcePlatform: 'instagram',
    category: 'ig_reels',
    tags: ['appreciation', 'soft', 'hook'],
    performanceRating: 'high',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ref-6',
    coverImageUrl: null,
    caption: 'that girl era, don\'t miss it',
    description: 'She\'s here and she\'s not slowing down 💅',
    imageCaption: 'that girl era, don\'t miss it',
    sourcePlatform: 'instagram',
    category: 'ig_reels',
    tags: ['lifestyle', 'confident', 'hook'],
    performanceRating: 'high',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ref-7',
    coverImageUrl: null,
    caption: 'this one is for the real ones',
    description: 'Full video on my page, you know the drill 🔗',
    imageCaption: 'this one is for the real ones',
    sourcePlatform: 'tiktok',
    category: 'tiktok_reel',
    tags: ['community', 'hook', 'teaser'],
    performanceRating: 'medium',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ref-8',
    coverImageUrl: null,
    caption: 'wait til you see what\'s on my page',
    description: 'Link in bio 😏 you won\'t be disappointed',
    imageCaption: 'wait til you see what\'s on my page',
    sourcePlatform: 'instagram',
    category: 'ig_reels',
    tags: ['teaser', 'cta', 'hook'],
    performanceRating: 'high',
    createdAt: new Date().toISOString(),
  },
];
