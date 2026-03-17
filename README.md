# Social Scheduler

A Next.js app for managing social media content across Instagram, TikTok, X, and Threads for OnlyFans creator accounts.

## Features

### Core Features
- **Model Management** - Switch between creator accounts with unique EXIF metadata presets
- **Calendar View** - Daily/Weekly/Monthly views with visual status indicators
- **VA Task Queue** - Mobile-friendly interface for Virtual Assistants
- **AI Caption Generation** - Multi-provider support (Claude, GPT-4, GLM-5)

### Advanced Features
- **Discord OAuth Login** - One-click authentication
- **Native Post Previews** - See how posts look on each platform
- **Instagram Feed Grid Simulator** - Preview and rearrange your feed
- **Carousel AI Analyzer** - Viral scores and optimal image ordering
- **VA Magic Links** - No-login access for contractors
- **AI Auto-Scheduler** - Bulk content scheduling with AI decisions
- **Story Auto-Generation** - Auto-select images from S3 folders

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State**: Zustand
- **Auth**: NextAuth.js (Discord provider)
- **AI**: Multi-provider (Anthropic, OpenAI, GLM-5)

## Quick Start

```bash
# Install dependencies
npm install

# Create .env.local with your API keys
cp .env.example .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

```env
# AI Provider (choose one or more)
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...          # Optional
GLM_API_KEY=...                 # Optional

# Discord OAuth
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
NEXTAUTH_SECRET=random_secret_key
NEXTAUTH_URL=http://localhost:3000

# Optional
INSTAGRAM_ACCESS_TOKEN=...      # For feed grid
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## Project Structure

```
social-scheduler/
├── app/
│   ├── page.tsx              # Admin dashboard (calendar)
│   ├── va/[token]/           # VA task queue
│   ├── gallery/              # Media gallery
│   ├── captions/             # Caption library
│   ├── models/               # Model management
│   ├── analytics/            # Analytics dashboard
│   ├── settings/             # Settings
│   └── api/                  # API routes
├── components/               # React components
├── lib/                      # Utilities and services
│   ├── store.ts              # Zustand state
│   ├── ai-service.ts         # Multi-provider AI
│   ├── auto-scheduler.ts     # AI scheduling
│   └── story-generation.ts   # Story automation
└── types/                    # TypeScript definitions
```

## Platform Support

| Platform | Post Types |
|----------|-----------|
| Instagram | Post (Carousel), Reel, Story |
| TikTok | Reel, Slideshow, Story |
| X/Twitter | Post |
| Threads | Post |
| Fanvue | All types |

## User Roles

### Admin
- Full access to all models and features
- Create/edit/delete posts
- Manage models and VAs
- Generate AI captions

### VA (Virtual Assistant)
- View assigned models only
- Download assets with proper naming
- Mark posts as completed

## File Naming

Downloaded files follow this pattern:
```
Platform_Type_MMDD_HHMM_order.ext

Examples:
Instagram_Post_0315_2100_1of5.jpg
Instagram_Reel_0315_2100.mp4
TikTok_Reel_0315_0900.mp4
```

## EXIF Metadata

Each model has a unique EXIF preset:
- Device info (iPhone 16 Pro, etc.)
- GPS coordinates with random offset
- ISO and focal length variance
- Randomized timestamps

## Deploy to Vercel

1. Push to GitHub
2. Import to Vercel
3. Configure environment variables
4. Deploy

## License

MIT
