# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Social Scheduler is a Next.js 16 application for managing social media content across Instagram, TikTok, X, and Threads for OnlyFans creator accounts. It supports multiple user roles (admin, agency, planner, VA) and includes AI-powered caption generation and auto-scheduling.

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Architecture

### App Router Structure

- `app/page.tsx` - Main admin dashboard (calendar view)
- `app/admin/` - Admin panel
- `app/va/[token]/` - VA task queue (magic link access)
- `app/models/` - Model management pages
- `app/gallery/` - Media gallery
- `app/captions/` - Caption library
- `app/stories/` - Story generation
- `app/analytics/` - Analytics dashboard
- `app/api/` - API routes including auth, AI generation, Meta/Fanvue integrations

### Key Directories

- `lib/` - Business logic and services
  - `store.ts` - Zustand state management (single source of truth)
  - `ai-service.ts` - Multi-provider AI (Anthropic, OpenAI, GLM-5, custom)
  - `auto-scheduler.ts` - AI-powered content scheduling
  - `story-generation.ts` - Story automation from S3 folders
  - `carousel-analyzer.ts` - Viral scoring for image carousels
  - `exif-spoofing.ts` - Device metadata injection
- `types/` - TypeScript definitions organized by domain
  - `models.ts` - Core domain entities (Model, User, Post, etc.)
  - `ai.ts` - AI provider and generation types
  - `integrations.ts` - S3, Meta, Fanvue configs
  - `utils.ts` - Utility types (filters, analysis, editor)
- `components/` - React components organized by feature
- `hooks/` - Custom React hooks

### State Management

Zustand store (`lib/store.ts`) manages all application state including:
- Current user and authentication
- Models, posts, captions, gallery assets
- Staging workflow state
- Integration configs (S3, Meta, Fanvue)
- UI state (modals, editing targets)

### AI Integration

The AI service (`lib/ai-service.ts`) supports multiple providers configured via environment variables:
- `AI_PROVIDER` - Select provider: `anthropic`, `openai`, `glm-5`, `custom`
- Each provider has its own API key env var (see `.env.example`)

### Import Patterns

Use `@/` path alias for imports:
```typescript
import { Post, Model } from '@/types/models';
import { useStore } from '@/lib/store';
import { createAIService } from '@/lib/ai-service';
```

### User Roles

- **admin** - Full access to all features
- **agency** - Agency-level management with feature access control
- **planner** - Content planning capabilities
- **va** - Virtual assistant with limited access via magic links

### Platform Post Types

Each platform supports specific post types defined in `types/models.ts`:
- Instagram: `instagram_post`, `instagram_reel`, `instagram_story`
- TikTok: `tiktok_reel`, `tiktok_slideshow`, `tiktok_story`
- X: `x_post`
- Threads: `threads_post`
- Fanvue: `fanvue_post`

### Staging Workflow

Content follows a workflow: `gallery` → `staging` → `editing` → `scheduling`
Assets can have multiple crop variants (1:1, 4:5, 9:16).

## Environment Setup

Copy `.env.example` to `.env.local` and configure:
1. AI provider (required for caption generation)
2. Discord OAuth credentials (required for auth)
3. S3 credentials (optional, for asset vault)
4. Meta/Fanvue tokens (optional, for publishing)
