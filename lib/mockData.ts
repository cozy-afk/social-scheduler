import { Model, User, Post, Caption, GalleryAsset, PostingFrequencyConfig } from '@/types/models';
import { addDays, format } from 'date-fns';

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
    postingSchedule: [
      { id: '1',  time: '09:00', platform: 'instagram', postType: 'instagram_post',   recurrence: 'daily' },
      { id: '2',  time: '09:00', platform: 'instagram', postType: 'instagram_reel',   recurrence: 'daily' },
      { id: '3',  time: '09:00', platform: 'tiktok',    postType: 'tiktok_reel',       recurrence: 'daily' },
      { id: '4',  time: '09:00', platform: 'tiktok',    postType: 'tiktok_slideshow',  recurrence: 'daily' },
      { id: '5',  time: '09:00', platform: 'x',         postType: 'x_post',            recurrence: 'daily' },
      { id: '6',  time: '09:00', platform: 'threads',   postType: 'threads_post',      recurrence: 'daily' },
      { id: '7',  time: '13:00', platform: 'instagram', postType: 'instagram_reel',   recurrence: 'daily' },
      { id: '8',  time: '13:00', platform: 'tiktok',    postType: 'tiktok_reel',       recurrence: 'daily' },
      { id: '9',  time: '21:00', platform: 'instagram', postType: 'instagram_post',   recurrence: 'daily' },
      { id: '10', time: '21:00', platform: 'instagram', postType: 'instagram_reel',   recurrence: 'daily' },
      { id: '11', time: '21:00', platform: 'tiktok',    postType: 'tiktok_slideshow',  recurrence: 'daily' },
      { id: '12', time: '21:00', platform: 'x',         postType: 'x_post',            recurrence: 'daily' },
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
    assignedVaIds: ['va-1', 'va-2'],
    postingFrequency: defaultFrequency,
    postingSchedule: [
      { id: '13', time: '10:00', platform: 'instagram', postType: 'instagram_post',  recurrence: 'daily' },
      { id: '14', time: '10:00', platform: 'instagram', postType: 'instagram_reel',  recurrence: 'daily' },
      { id: '15', time: '10:00', platform: 'tiktok',    postType: 'tiktok_reel',      recurrence: 'daily' },
      { id: '16', time: '14:00', platform: 'instagram', postType: 'instagram_reel',  recurrence: 'daily' },
      { id: '17', time: '20:00', platform: 'tiktok',    postType: 'tiktok_slideshow', recurrence: 'daily' },
    ],
    status: 'active',
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Sofia',
    profileImage: '🌹',
    agencyId: 'agency-1',
    fanvueAccountId: '',
    s3Folder: 'SOFIA',
    exifPreset: generateExifPreset(),
    assignedVaIds: ['va-2'],
    postingFrequency: defaultFrequency,
    postingSchedule: [
      { id: '18', time: '08:00', platform: 'instagram', postType: 'instagram_post',  recurrence: 'daily' },
      { id: '19', time: '12:00', platform: 'tiktok',    postType: 'tiktok_reel',      recurrence: 'daily' },
      { id: '20', time: '18:00', platform: 'instagram', postType: 'instagram_reel',  recurrence: 'daily' },
    ],
    status: 'active',
    createdAt: new Date().toISOString(),
  },
  {
    id: '4',
    name: 'Kyla',
    profileImage: '🌸',
    agencyId: 'agency-1',
    fanvueAccountId: '',
    s3Folder: 'KYLA',
    exifPreset: generateExifPreset(),
    assignedVaIds: ['va-1'],
    postingFrequency: defaultFrequency,
    postingSchedule: [
      { id: '21', time: '10:00', platform: 'instagram', postType: 'instagram_reel',  recurrence: 'daily' },
      { id: '22', time: '15:00', platform: 'tiktok',    postType: 'tiktok_reel',      recurrence: 'daily' },
    ],
    status: 'active',
    createdAt: new Date().toISOString(),
  },
  {
    id: '5',
    name: 'Celia',
    profileImage: '✨',
    agencyId: 'agency-1',
    fanvueAccountId: '',
    s3Folder: 'CELIA',
    exifPreset: generateExifPreset(),
    assignedVaIds: ['va-2'],
    postingFrequency: defaultFrequency,
    postingSchedule: [
      { id: '23', time: '11:00', platform: 'instagram', postType: 'instagram_post',  recurrence: 'daily' },
      { id: '24', time: '19:00', platform: 'instagram', postType: 'instagram_reel',  recurrence: 'daily' },
    ],
    status: 'active',
    createdAt: new Date().toISOString(),
  },
  // Agency-2 models (should not be visible to agency-1 users)
  {
    id: '6',
    name: 'Nina',
    profileImage: '🦋',
    agencyId: 'agency-2',
    fanvueAccountId: '',
    s3Folder: 'NINA',
    exifPreset: generateExifPreset(),
    assignedVaIds: [],
    postingFrequency: defaultFrequency,
    postingSchedule: [
      { id: '25', time: '11:00', platform: 'instagram', postType: 'instagram_post',  recurrence: 'daily' },
      { id: '26', time: '11:00', platform: 'tiktok',    postType: 'tiktok_reel',      recurrence: 'daily' },
    ],
    status: 'active',
    createdAt: new Date().toISOString(),
  },
  {
    id: '7',
    name: 'Maya',
    profileImage: '🌺',
    agencyId: 'agency-2',
    fanvueAccountId: '',
    s3Folder: 'MAYA',
    exifPreset: generateExifPreset(),
    assignedVaIds: [],
    postingFrequency: defaultFrequency,
    postingSchedule: [
      { id: '27', time: '14:00', platform: 'instagram', postType: 'instagram_reel',  recurrence: 'daily' },
      { id: '28', time: '16:00', platform: 'threads',   postType: 'threads_post',    recurrence: 'daily' },
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

export const mockGalleryAssets: GalleryAsset[] = Array.from({ length: 12 }, (_, i) => ({
  id: `gallery-${i + 1}`,
  fileName: `content_${String(i + 1).padStart(3, '0')}.${i % 4 === 0 ? 'mp4' : 'jpg'}`,
  fileUrl: '/demo-image.jpg',
  fileType: (i % 4 === 0 ? 'video' : 'image') as 'image' | 'video',
  width: i % 3 === 0 ? 1080 : i % 3 === 1 ? 1080 : 720,
  height: i % 3 === 0 ? 1080 : i % 3 === 1 ? 1350 : 1280,
  aspectRatio: i % 3 === 0 ? 1.0 : i % 3 === 1 ? 0.8 : 0.5625,
  sizeBytes: Math.floor(Math.random() * 5000000) + 500000,
  uploadedAt: addDays(new Date(), -i).toISOString(),
  source: 's3' as const,
  s3Key: `uploads/model-1/${i + 1}.jpg`,
}));
