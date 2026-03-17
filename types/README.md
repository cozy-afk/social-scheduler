# Type Definitions Structure

This document provides an overview of the consolidated TypeScript type definitions in the `types/` directory.

## File Structure

### Core Type Files

- **`models.ts`** - Core domain models (Model, User, Post, Caption, Asset, etc.)
- **`ai.ts`** - AI-related types (providers, settings, caption generation, story generation)
- **`integrations.ts`** - Third-party integration configurations (S3, Meta, Fanvue)
- **`utils.ts`** - Utility types and helper types (filters, EXIF, analysis, editor types)
- **`index.ts`** - Centralized exports for clean imports
- **`next-auth.d.ts`** - NextAuth.js type extensions

## Import Patterns

### Recommended Import Patterns

**Option 1: Import from specific type files (most common)**
```typescript
import { Post, Model, User } from '@/types/models';
import { AIProvider, StoryGenerationConfig } from '@/types/ai';
import { S3Config, MetaConfig } from '@/types/integrations';
import { CarouselAnalysis, MediaItem } from '@/types/utils';
```

**Option 2: Import from index (for multiple files)**
```typescript
import { Post, Model, AIProvider, S3Config, CarouselAnalysis } from '@/types';
```

### Usage Examples

```typescript
// Core domain models
import { Model, User, Post, Caption, Asset, Platform, PostType } from '@/types/models';

// AI functionality
import { AIProvider, AIProviderConfig, CaptionGenerationRequest } from '@/types/ai';

// Integration configs
import { S3Config, MetaConfig, FanvueConfig } from '@/types/integrations';

// Utility types
import { InstagramFilter, EXIFPreset, CarouselAnalysis, MediaItem } from '@/types/utils';
```

## Type Categories

### Core Models (`models.ts`)

#### User & Role Management
- `UserRole` - User role types
- `User` - User entity
- `Agency` - Agency entity
- `AgencyFeatureAccess` - Agency permissions

#### Model Management
- `Model` - Model entity with posting schedules
- `TimeSlot` - Scheduled posting times
- `PostingFrequencyConfig` - Posting frequency settings

#### Post & Content
- `Post` - Post entity
- `PostStatus` - Post status types
- `PostType` - Post type variations
- `Platform` - Social media platforms

#### Asset Management
- `Asset` - Media assets
- `GalleryAsset` - Gallery media items
- `CropRatio` - Image aspect ratios

#### Caption Management
- `Caption` - Caption entity
- `CaptionCategory` - Caption categorization
- `PostReference` - Reference posts for caption examples

#### Workflow & VA
- `VAMagicLink` - Magic links for VAs
- `StagedAsset` - Assets in staging workflow
- `StagedVariant` - Crop variants
- `WorkflowStep` - Workflow stages

### AI Types (`ai.ts`)

#### Provider Configuration
- `AIProvider` - AI provider types
- `AIProviderConfig` - Provider configuration
- `AISettings` - Comprehensive AI settings
- `AI_PROVIDERS` - Provider constants
- `AI_ENV_KEYS` - Environment variable names

#### Caption Generation
- `CaptionGenerationRequest` - Request parameters
- `CaptionGenerationResponse` - Response structure

#### Story Generation
- `StoryGenerationConfig` - Story generation settings
- `StoryFolderConfig` - Folder configuration
- `StoryCropStrategy` - Crop strategy types
- `CropStrategy` - Available crop strategies

### Integration Types (`integrations.ts`)

#### Cloud & Social Platforms
- `S3Config` - AWS S3 configuration
- `MetaConfig` - Meta (Facebook/Instagram) configuration
- `FanvueConfig` - Fanvue configuration

### Utility Types (`utils.ts`)

#### Image Processing
- `InstagramFilter` - Instagram filter definitions
- `EXIFPreset` - EXIF metadata presets

#### Analysis & Validation
- `ARViolation` - Aspect ratio violations
- `ARCheckResult` - Aspect ratio check results
- `CarouselAnalysis` - Carousel analysis results
- `ImageScore` - Image scoring details

#### Scheduling
- `AutoScheduleConfig` - Auto-scheduler configuration
- `AutoScheduleResult` - Auto-scheduler results

#### Image Editor
- `FilterState` - Filter application state
- `OverlayItem` - Text/emoji overlays
- `EditableImage` - Image editing context
- `ImageEditorResult` - Editor output
- `EditorTool` - Available editor tools
- `LocalCropRatio` - Crop ratio options

#### Component Types
- `ActivePage` - Navigation page types
- `CalendarViewType` - Calendar view options
- `PostFormat` - Post format types
- `MediaItem` - Media item in editor

## Migration Notes

### Consolidation Changes

1. **Merged AI Types**: `ai-config.ts` and `ai-providers.ts` were consolidated into `ai.ts`
2. **Created Utility Types**: Inline types from lib files were moved to `utils.ts`
3. **Created Integration Types**: Config types from store were moved to `integrations.ts`
4. **Added Index Exports**: Centralized exports for cleaner imports

### Updated Files

**Services (lib/)**
- `ai-service.ts` - Updated to import from `@/types/ai`
- `story-generation.ts` - Updated to import from `@/types/ai`
- `auto-scheduler.ts` - Updated to import from `@/types/utils`
- `carousel-analyzer.ts` - Updated to import from `@/types/utils`
- `ar-checker.ts` - Updated to import from `@/types/utils`
- `exif-spoofing.ts` - Updated to import from `@/types/utils`
- `instagram-filters.ts` - Updated to import from `@/types/utils`
- `store.ts` - Updated to import from `@/types/integrations`

**Components (components/)**
- `AppHeader.tsx` - Updated to import from `@/types/utils`
- `CalendarViewSwitcher.tsx` - Updated to import from `@/types/utils`
- `CreatePostModal.tsx` - Updated to import from `@/types/utils`
- `ImageEditor.tsx` - Updated to import from `@/types/utils`

**API Routes (app/api/)**
- `generate-captions/route.ts` - Updated to import from `@/types/ai`
- `generate-stories/route.ts` - Updated to import from `@/types/ai`

## Naming Conventions

- **Interfaces**: PascalCase (e.g., `User`, `Post`, `AIProviderConfig`)
- **Type Aliases**: PascalCase for unions/literals (e.g., `Platform`, `PostType`, `UserRole`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `AI_PROVIDERS`, `AI_ENV_KEYS`)
- **File Names**: kebab-case (e.g., `ai.ts`, `integrations.ts`)

## Best Practices

1. **Import Specific Types**: Import only the types you need from specific files
2. **Avoid Circular Dependencies**: Don't import between type files
3. **Document Complex Types**: Add JSDoc comments for complex interfaces
4. **Use Strict Typing**: Avoid `any` - use proper types or `unknown`
5. **Keep Types Small**: Break down large interfaces into smaller, focused ones

## Future Enhancements

1. **Runtime Validation**: Consider adding zod or similar for runtime type checking
2. **Type Guards**: Add utility type guards for type narrowing
3. **Generic Types**: Add more generic types for reusable patterns
4. **Strict Mode**: Enable stricter TypeScript compiler options incrementally
