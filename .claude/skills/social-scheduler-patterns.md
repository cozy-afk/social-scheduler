---
name: social-scheduler-patterns
description: Coding patterns extracted from the social-scheduler Next.js project — state management, API routes, component structure, and type conventions
version: 1.0.0
source: local-git-analysis
analyzed_commits: 4
---

# Social Scheduler Patterns

## Commit Conventions

Use descriptive commit messages with optional type prefixes:

```
feat: add batch scheduler for multi-platform posts
fix: resolve modal close behavior on ESC key
refactor: extract date utilities to lib/utils/date.ts
chore: update dependencies
```

Avoid bare commit messages like `"commit"` — always describe the change.

## Code Architecture

```
app/                    # Next.js App Router pages & API routes
├── api/                # API routes — one route.ts per endpoint
│   ├── generate-*/     # AI generation endpoints
│   ├── meta/           # Meta/Instagram API integrations
│   └── cron/           # Scheduled job handlers
├── admin/              # Admin panel pages
├── va/[token]/         # VA magic-link access pages
└── [feature]/page.tsx  # Feature pages

components/             # React components (PascalCase filenames)
hooks/                  # Custom React hooks (use* prefix)
lib/                    # Business logic & services
├── store.ts            # Zustand state (single source of truth)
├── ai-service.ts       # Multi-provider AI abstraction
├── auto-scheduler.ts   # Scheduling logic
├── constants/          # Platform config, enums
│   ├── platform.ts     # Per-platform themes, post type configs
│   └── index.ts        # Re-exports
└── utils/              # Pure utility functions
    ├── date.ts         # Date formatting (date-fns)
    └── posts.ts        # Post filtering, slot status helpers

types/                  # TypeScript definitions by domain
├── models.ts           # Core entities (Model, User, Post, etc.)
├── ai.ts               # AI provider & generation types
├── integrations.ts     # S3, Meta, Fanvue configs
└── utils.ts            # Utility types (filters, analysis)
```

## Import Pattern

Always use the `@/` path alias — never relative paths crossing feature boundaries:

```typescript
import { Post, Model, Platform } from '@/types/models';
import { useStore } from '@/lib/store';
import { getPlatformTheme } from '@/lib/constants/platform';
```

## State Management (Zustand)

`lib/store.ts` is the single source of truth for all app state. Follow this interface pattern for each domain slice:

```typescript
// Interface pattern: set*, add*, update*, delete*
interface AppState {
  // Collection state
  posts: Post[];
  setPosts: (posts: Post[]) => void;
  addPost: (post: Post) => void;
  updatePost: (id: string, updates: Partial<Post>) => void;
  deletePost: (id: string) => void;
}

// Implementation — always use immutable spread updates
updatePost: (id, updates) => set(state => ({
  posts: state.posts.map(p => p.id === id ? { ...p, ...updates } : p)
})),
```

**Rule**: Never mutate state in-place. Always return new objects via spread.

## API Routes

All API routes use the `withErrorHandler` wrapper from `lib/api-utils.ts`:

```typescript
// app/api/my-feature/route.ts
import {
  parseRequestBody,
  validateRequiredFields,
  successResponse,
  errorResponse,
  withErrorHandler,
} from '@/lib/api-utils';

interface MyRequest {
  platform: string;
  content: string;
}

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await parseRequestBody<MyRequest>(request);

  const validation = validateRequiredFields(body, ['platform', 'content']);
  if (!validation.valid) {
    return errorResponse(validation.error!, 400);
  }

  // business logic...

  return successResponse({ result });
});
```

**Never** write try/catch in route handlers — `withErrorHandler` covers it.

## Platform Constants Pattern

Platform-specific config lives in `lib/constants/platform.ts`, not hardcoded in components:

```typescript
// lib/constants/platform.ts — add new platform config here
export function getPlatformTheme(platform: Platform) { ... }
export function getPostTypeConfig(postType: PostType) { ... }
export function getPostTypeColor(postType: PostType) { ... }
```

## Custom Hooks

Hooks wrap `useMemo` for derived platform/post-type data:

```typescript
// hooks/usePlatformTheme.ts pattern
export function usePlatformTheme(platform: Platform) {
  return useMemo(() => getPlatformTheme(platform), [platform]);
}
```

Keep hooks in `hooks/` directory, export all from `hooks/index.ts`.

## Type Conventions

- **Union types for enums**: `type Platform = 'instagram' | 'tiktok' | 'x' | 'threads' | 'fanvue'`
- **Record types for config maps**: `Record<PostType, { maxLength: number; style: string }>`
- **Interface for entities**: `interface Post { id: string; modelId: string; ... }`
- **Partial for updates**: `updatePost(id: string, updates: Partial<Post>)`

## Staging Workflow

Content follows a linear workflow — always update status through the store:

```
gallery → staging → editing → scheduling → published
```

Assets support multiple crop variants: `'1:1' | '4:5' | '9:16'`

## Platform Post Types

Map platforms to their allowed post types:

| Platform  | Post Types |
|-----------|------------|
| Instagram | `instagram_post`, `instagram_reel`, `instagram_story` |
| TikTok    | `tiktok_reel`, `tiktok_slideshow`, `tiktok_story` |
| X         | `x_post` |
| Threads   | `threads_post` |
| Fanvue    | `fanvue_post` |

## User Roles

Guard feature access by role — check `currentUser.role` from the store:

```typescript
const { currentUser } = useStore();
if (currentUser?.role !== 'admin') return null;
```

Roles: `'admin' | 'agency' | 'planner' | 'va'`

VA users access via magic link tokens: `app/va/[token]/page.tsx`

## AI Service Usage

Always use `createAIService()` from `lib/ai-service.ts` — never instantiate providers directly in routes:

```typescript
import { createAIService } from '@/lib/ai-service';

const aiService = createAIService(); // reads AI_PROVIDER env var
const result = await aiService.generateCaptions({ platform, postType, examples });
```
