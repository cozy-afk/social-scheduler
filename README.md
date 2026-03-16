# Social Scheduler - OnlyFans Multi-Platform Content Manager

A Next.js app for managing social media content across Instagram, TikTok, X, and Threads for 100+ OnlyFans creator accounts with multiple VAs.

## Features

### ✅ Implemented (MVP Prototype)

1. **Model Management**
   - Switch between different creator accounts
   - Each model has unique EXIF metadata preset
   - Customizable posting schedules per model

2. **Calendar View (Admin)**
   - Time-slot based grid showing all platforms
   - Visual status indicators:
     - ✅ Scheduled (blue)
     - ⚠️ Draft (yellow)
     - ❌ Missing (red)
     - ✓ Completed (green)
   - Missing content alerts
   - One-click post creation
   - **NEW**: Instagram & TikTok story support

3. **VA Task Queue**
   - Clean mobile-friendly interface
   - Shows next posts due for assigned models
   - Platform-specific file naming
   - Download with EXIF spoofing (simulated)
   - Mark as posted functionality
   - **NEW**: Story downloads

4. **AI Caption Generation**
   - **NEW**: Multi-provider support (Claude, GPT-4, GLM-4)
   - Learns from your caption library
   - Platform-specific rules (length, style, emojis)
   - Generates 3 suggestions per request
   - Choose your preferred AI provider

5. **Post Creation**
   - Platform-specific templates
   - File upload (images/videos)
   - Schedule date/time picker
   - AI caption suggestions
   - **NEW**: Story post types

6. **Story Auto-Generation** ⭐ NEW
   - Auto-select images from categorized S3 folders (daily-life, food, selfies, gym)
   - Smart crop to 9:16 aspect ratio with multiple strategies
   - Approval queue for managers
   - 3-4 stories per day automated
   - Alternates between Instagram & TikTok

### 🚧 Next Phase (To Be Built)

- Caption library CRUD interface
- S3 bucket integration for asset storage
- Real EXIF metadata spoofing
- Text overlay editor for slideshows
- Bulk scheduling operations
- Performance tracking
- VA assignment management
- Database integration (PostgreSQL)

---

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State**: Zustand
- **AI**: Anthropic Claude API
- **Icons**: Lucide React
- **Date Handling**: date-fns

---

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Environment Variables

Create a `.env.local` file:

```env
# AI Provider API Keys (use one or more)
# Anthropic Claude - Get your key at: https://console.anthropic.com
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# OpenAI GPT - Get your key at: https://platform.openai.com (optional)
OPENAI_API_KEY=your_openai_api_key_here

# GLM (Zhipu AI) - Get your key at: https://open.bigmodel.cn (optional)
GLM_API_KEY=your_glm_api_key_here

# Database (Future - not needed for prototype)
# DATABASE_URL=your_postgres_url

# S3 Credentials (Future)
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# AWS_S3_BUCKET=
```

**To get your Anthropic API key:**
1. Go to https://console.anthropic.com
2. Create an account or sign in
3. Navigate to API Keys
4. Create a new key

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deploy to Vercel

### Option 1: One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/social-scheduler)

### Option 2: Manual Deploy

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin your-repo-url
   git push -u origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repo
   - Configure environment variables:
     - `ANTHROPIC_API_KEY`
   - Click "Deploy"

3. **Done!** Your app will be live at `https://your-project.vercel.app`

---

## File Naming Convention

When VAs download assets, files are named according to this pattern:

```
Platform_Type_MMDD_HHMM_order.ext

Examples:
Instagram_Post_0315_2100_1of5.jpg
Instagram_Post_0315_2100_2of5.jpg
Instagram_Reel_0315_2100.mp4
TikTok_Reel_0315_0900.mp4
TikTok_Slide_0315_1300_1of4.jpg
X_Post_0315_1400_1.jpg
Threads_Post_0315_0900_1.jpg
```

This ensures:
- Easy identification on cloud phones
- Correct upload order for carousels
- Platform-specific organization

---

## EXIF Metadata System

Each model gets a unique EXIF preset generated at creation:

```typescript
{
  device: "iPhone 16 Pro",
  model: "iPhone17,1",
  lens: "iPhone 16 Pro back triple camera 6.86mm f/1.78",
  software: "iOS 18.2.1",
  gpsLatitude: 34.0522 + randomOffset,
  gpsLongitude: -118.2437 + randomOffset,
  isoVariance: [100, 200, 400, 800],
  focalLengthVariance: [6.86, 9.0, 24.0]
}
```

On download, this metadata is applied to each file with:
- Randomized timestamp (±5 mins from download time)
- Slight ISO variations
- Consistent GPS location per model

---

## Project Structure

```
social-scheduler/
├── app/
│   ├── page.tsx              # Admin dashboard
│   ├── va/
│   │   └── page.tsx          # VA task queue
│   ├── captions/
│   │   └── page.tsx          # Caption library (to be built)
│   ├── api/
│   │   └── generate-captions/
│   │       └── route.ts      # Claude API endpoint
│   ├── layout.tsx
│   └── globals.css
│
├── components/
│   ├── ModelSwitcher.tsx     # Switch between creator accounts
│   ├── CalendarView.tsx      # Admin calendar grid
│   ├── VATaskQueue.tsx       # VA task list
│   └── CreatePostModal.tsx   # Post creation form
│
├── lib/
│   ├── store.ts              # Zustand global state
│   └── mockData.ts           # Demo data
│
├── types/
│   └── models.ts             # TypeScript interfaces
│
└── package.json
```

---

## How It Works

### Admin Workflow

1. **Select Model** from dropdown
2. **View Calendar** to see scheduled posts and gaps
3. **Create Posts** by clicking time slots or "Create Post" button
4. **Use AI Captions** - Click "Generate AI Suggestions" for caption ideas
5. **Upload Assets** - Add images/videos
6. **Schedule** - Posts appear in VA queue

### VA Workflow

1. **Select Model** from assigned models
2. **View Next Posts** - See upcoming scheduled posts
3. **Download Assets** - Click to download files with proper naming
4. **Post to Platforms** - Upload to Instagram, TikTok, etc.
5. **Mark as Posted** - Update status so admins can track

---

## Caption AI System

The AI learns from your caption library and generates platform-specific suggestions:

**Platform Rules:**
- **Instagram Posts/Reels**: Short (150 chars), emoji-rich, captivating
- **TikTok Reels**: Very short (100 chars), engaging, teasing
- **TikTok Slideshows**: Very short with swipe CTA
- **X/Threads**: Longer form (280 chars), conversational

**Example Workflow:**
1. Build caption library with proven high-performers
2. Tag captions by performance (high/medium/low)
3. AI learns patterns and generates matching suggestions
4. One-click to apply suggested caption
5. Save successful new captions back to library

---

## Database Schema (Future Implementation)

When you're ready to connect a database, here's the recommended schema:

### Models Table
```sql
CREATE TABLE models (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  profile_image VARCHAR(255),
  exif_preset JSONB,
  posting_schedule JSONB,
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Posts Table
```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY,
  model_id UUID REFERENCES models(id),
  platform VARCHAR(50),
  post_type VARCHAR(50),
  scheduled_time TIMESTAMP,
  status VARCHAR(50),
  caption TEXT,
  assigned_va_id UUID,
  completed_at TIMESTAMP,
  completed_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Assets Table
```sql
CREATE TABLE assets (
  id UUID PRIMARY KEY,
  post_id UUID REFERENCES posts(id),
  file_url VARCHAR(500),
  file_name VARCHAR(255),
  file_type VARCHAR(50),
  order_index INTEGER,
  overlay_config JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Captions Table
```sql
CREATE TABLE captions (
  id UUID PRIMARY KEY,
  platform VARCHAR(50),
  post_type VARCHAR(50),
  text TEXT,
  performance_rating VARCHAR(50),
  tags TEXT[],
  model_id UUID REFERENCES models(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Recommended Next Steps

### Phase 1: Database Integration
- Set up Vercel Postgres or Supabase
- Migrate from mock data to real database
- Add user authentication

### Phase 2: File Storage
- Connect to your S3 bucket
- Implement real file uploads
- Add EXIF spoofing library (exiftool or piexif)

### Phase 3: Caption Library
- Build caption CRUD interface
- Add performance tracking
- Implement bulk import/export

### Phase 4: Advanced Features
- Text overlay editor (Fabric.js or Konva.js)
- Bulk scheduling (weekly templates)
- Analytics dashboard
- VA performance metrics

---

## Environment Variables Reference

```env
# Required for AI caption generation
ANTHROPIC_API_KEY=sk-ant-...

# Future: Database
DATABASE_URL=postgresql://...

# Future: S3 Storage
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
AWS_REGION=us-east-1

# Future: Authentication
NEXTAUTH_SECRET=
NEXTAUTH_URL=https://your-domain.com
```

---

## Troubleshooting

### AI Caption Generation Not Working
- Check `ANTHROPIC_API_KEY` is set correctly in Vercel environment variables
- Verify API key has credits at console.anthropic.com
- Check browser console for error messages

### Downloads Not Working
- Currently simulated with alerts (will need backend implementation)
- Real implementation requires file storage integration

### Styling Issues
- Run `npm run dev` locally to see Tailwind compile
- Check browser console for CSS errors
- Verify Tailwind config includes all component paths

---

## Support & Feedback

This is a prototype MVP. For production deployment, you'll need to:

1. Add authentication (NextAuth.js recommended)
2. Connect to real database
3. Implement S3 integration
4. Add EXIF spoofing library
5. Build caption library interface
6. Add proper error handling
7. Implement rate limiting on AI endpoint

---

## License

MIT License - feel free to modify and use for your business!
