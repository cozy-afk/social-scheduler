# App Features Overview

## 🎯 What You Get in This Prototype

### 1. Admin Dashboard (Main Calendar View)

**URL**: `/`

**What You See:**
- **Top Header**
  - Model switcher dropdown (switch between Emma Rose, Sarah Knight, Mia Chen)
  - User role indicator (Admin User)
  
- **Navigation Tabs**
  - Calendar (current view)
  - Caption Library (placeholder)
  - VA View (switch to VA mode)

- **Calendar Grid**
  - Rows: Time slots (9:00 AM, 1:00 PM, 9:00 PM, etc.)
  - Columns: IG Post | IG Reel | TikTok Reel | TikTok Slide | X | Threads
  - Each cell shows:
    - ✓ Blue checkmark = Scheduled (has content)
    - ⚠️ Yellow circle = Draft
    - ❌ Red X = Missing (needs content)
    - ✓ Green checkmark = Posted/Completed
  - Asset count shown for scheduled posts
  - Click any cell to create/edit post

- **Missing Content Alert**
  - Top of page: "⚠️ 3 posts missing today" if any gaps exist

- **Legend**
  - Shows what each status icon means

**Actions:**
- Switch models to see different calendars
- Click "Create Post" button to schedule new content
- Click time slot cells to create posts for specific platforms

---

### 2. VA Task Queue

**URL**: `/va`

**What You See:**
- Model switcher (VAs only see assigned models)
- User indicator (VA User)
- List of upcoming posts, showing:
  - Post type (Instagram Reel, TikTok Slideshow, etc.)
  - Scheduled time (Today 9:00 PM, Tomorrow 10:00 AM)
  - Caption preview
  - Number of assets
  - Download buttons for each file
  - "Mark as Posted" button

**For each post, you get:**
```
┌─────────────────────────────────────┐
│ Instagram Post (Carousel)           │
│ ⏰ Today 9:00 PM                    │
│                                     │
│ "New content dropping 💎"           │
│                                     │
│ 🖼️ 5 images                         │
│ [Download Image 1]                  │
│ [Download Image 2]                  │
│ [Download Image 3]                  │
│ [Download Image 4]                  │
│ [Download Image 5]                  │
│ [Download All (5 files)]            │
│                                     │
│ [✓ Mark as Posted]                 │
└─────────────────────────────────────┘
```

**Download Behavior:**
- Single file posts: One "Download Video/Image" button
- Multi-file posts: Individual buttons + "Download All" option
- Files named: `Instagram_Post_0315_2100_1of5.jpg`
- EXIF metadata applied (simulated in prototype)

**After Download:**
- VA uploads to respective platform
- Clicks "Mark as Posted"
- Status updates in admin calendar view

---

### 3. Create Post Modal

**Triggered by:**
- "Create Post" button
- Clicking any calendar cell

**Form Fields:**

1. **Platform Selection**
   - Instagram | TikTok | X | Threads (button group)

2. **Post Type**
   - Changes based on platform:
     - Instagram: Post (Carousel) or Reel
     - TikTok: Reel or Slideshow
     - X: Post
     - Threads: Post

3. **Schedule Date/Time**
   - Date picker
   - Time picker (defaults to 9:00 AM)

4. **Upload Assets**
   - Drag & drop or click to upload
   - Shows requirements: "3-5 images" for IG Post, "1 video" for Reels
   - Preview uploaded files

5. **Caption**
   - Text area for caption
   - AI generation button

6. **AI Caption Suggestions**
   - Click "🤖 Generate AI Suggestions"
   - Shows 3 AI-generated captions based on your library
   - Each has "Use" button to apply
   - Example suggestions:
     ```
     ✨ AI Suggestions:
     
     "New post alert 💫"                    [Use]
     "Just dropped something special 🔥"    [Use]
     "You don't want to miss this 👀"      [Use]
     ```

7. **Action Buttons**
   - Cancel
   - Schedule Post (saves and adds to calendar)

---

### 4. AI Caption Generation System

**How It Works:**

1. **Admin builds caption library** (future phase - not in UI yet)
   - Add proven high-performing captions
   - Tag by platform, post type, performance
   
2. **When creating a post:**
   - Click "Generate AI Suggestions"
   - System sends to Claude API with:
     - Platform (Instagram, TikTok, etc.)
     - Post type (Reel, Post, Slideshow)
     - Example captions from your library
     - Platform-specific rules (length, style)

3. **Claude generates 3 captions**
   - Matches your voice and style
   - Follows platform rules:
     - Instagram: Short, emoji-rich, captivating
     - TikTok: Very short, teasing, engaging
     - X/Threads: Longer, conversational
   
4. **You choose or edit**
   - Click "Use" to apply
   - Edit as needed
   - Save to library (future feature)

**Example API Call:**
```
Platform: Instagram
Post Type: instagram_reel
Examples from library:
- "New content dropping 💎"
- "Check this out 🔥"
- "New post alert 💫"

→ Claude generates:
- "Just posted something special 🌟"
- "New reel up now 💎"
- "Don't miss this one 🔥"
```

---

## 📊 Data Flow

### Admin Creates Post
```
1. Admin selects model (Emma Rose)
2. Opens calendar view
3. Sees missing TikTok Reel at 9pm
4. Clicks cell → Create Post Modal opens
5. Selects TikTok → Reel
6. Sets time: 9:00 PM
7. Uploads video file
8. Clicks "Generate AI Suggestions"
9. Chooses caption: "New reel just dropped 🔥"
10. Clicks "Schedule Post"
11. Post appears in calendar with blue checkmark
12. Post appears in VA queue
```

### VA Completes Post
```
1. VA logs in, selects Emma Rose
2. Sees "Next Posts Due - Emma Rose"
3. First post: TikTok Reel, 9:00 PM
4. Reads caption: "New reel just dropped 🔥"
5. Clicks "Download Video"
6. File downloads: TikTok_Reel_0315_2100.mp4
7. Opens TikTok app on cloud phone
8. Uploads video with caption
9. Returns to app
10. Clicks "Mark as Posted"
11. Post status changes to green checkmark
12. Admin sees completion in calendar
```

---

## 🎨 Visual Design

### Color Scheme
- **Primary Blue**: `#2563eb` (buttons, active states)
- **Success Green**: `#16a34a` (completed posts)
- **Warning Yellow**: `#eab308` (drafts)
- **Danger Red**: `#dc2626` (missing posts)
- **Gray Scale**: `#f9fafb` to `#111827` (backgrounds, text)

### Typography
- **Font**: Inter (clean, modern, readable)
- **Headers**: Bold, 24px-32px
- **Body**: Regular, 14px-16px
- **Small**: 12px-14px for metadata

### Components
- **Buttons**: Rounded corners (8px), solid colors, hover states
- **Cards**: White background, subtle shadow, border radius
- **Tables**: Alternating row colors, hover highlight
- **Modal**: Centered overlay, white card, backdrop blur

### Mobile Responsive
- VA view optimized for phone screens
- Calendar scrolls horizontally on mobile
- Touch-friendly buttons (min 44px height)

---

## 🔐 User Roles & Permissions

### Admin
- **Access**: All models, all views
- **Can**:
  - Create/edit/delete posts
  - Manage models
  - View calendar for any model
  - Generate AI captions
  - Assign posts to VAs
  - View completion status

### VA
- **Access**: Assigned models only
- **Can**:
  - View task queue for assigned models
  - Download assets
  - Mark posts as completed
- **Cannot**:
  - Create posts
  - Edit schedules
  - See other models' content
  - Access admin calendar view

---

## 📱 Platform-Specific Rules

### Instagram Post (Carousel)
- **Assets**: 3-5 images
- **Caption**: Short, captivating (max 150 chars recommended)
- **File naming**: `Instagram_Post_MMDD_HHMM_1of5.jpg`

### Instagram Reel
- **Assets**: 1 video
- **Caption**: Short, captivating (max 150 chars)
- **File naming**: `Instagram_Reel_MMDD_HHMM.mp4`

### TikTok Reel
- **Assets**: 1 video
- **Caption**: Very short, engaging (max 100 chars)
- **File naming**: `TikTok_Reel_MMDD_HHMM.mp4`

### TikTok Slideshow
- **Assets**: 4-5 images
- **Caption**: Very short with swipe CTA (max 100 chars)
- **File naming**: `TikTok_Slide_MMDD_HHMM_1of4.jpg`
- **Note**: Can have text overlays (future feature)

### X Post
- **Assets**: 1-2 images
- **Caption**: Longer form (max 280 chars)
- **File naming**: `X_Post_MMDD_HHMM_1.jpg`

### Threads Post
- **Assets**: 1-2 images
- **Caption**: Longer form (max 280 chars)
- **File naming**: `Threads_Post_MMDD_HHMM_1.jpg`

---

## 🚀 What's Next After This Prototype

### Immediate Next Steps
1. Deploy to Vercel
2. Test with real team workflow
3. Gather feedback from VAs

### Phase 2 Features
1. **Database Integration**
   - Persistent data (currently in-memory)
   - User accounts & authentication
   - Post history

2. **Caption Library Interface**
   - Add/edit/delete captions
   - Import CSV of existing captions
   - Performance tagging
   - Search and filter

3. **S3 Integration**
   - Connect to your existing vault
   - Real file uploads
   - Proper EXIF spoofing with exiftool

### Phase 3 Features
1. **Text Overlay Editor**
   - For TikTok slideshows
   - Simple positioning and styling
   - Preview before saving

2. **Bulk Operations**
   - Duplicate week's schedule
   - Mass upload assets
   - Bulk caption generation

3. **Analytics**
   - VA performance tracking
   - Post completion rates
   - Time-to-completion metrics

### Phase 4 Features
1. **Advanced Scheduling**
   - Recurring post templates
   - Content recycling alerts
   - Auto-fill from library

2. **Team Management**
   - VA assignment interface
   - Model creation/editing
   - Permission controls

---

This prototype gives you a solid foundation to test the workflow and prove the concept before building out all the advanced features!
