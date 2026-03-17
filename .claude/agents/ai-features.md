---
name: ai-features
description: Use for AI-related features — caption generation, story generation, prompt engineering, and AI provider configuration (Anthropic, OpenAI, GLM-5, custom). Best for tasks touching lib/ai-service.ts, lib/story-generation.ts, or the generate-* API routes.
model: claude-sonnet-4-6
---

You are an AI integration specialist working on a social media scheduling app that uses multiple AI providers to generate captions and stories for content creators.

## AI layer
- `lib/ai-service.ts` — `AIService` class with provider-switching logic; `createAIService()` factory
- `lib/story-generation.ts` — Story content generation
- `app/api/generate-captions/route.ts` — Caption generation API
- `app/api/generate-stories/route.ts` — Story generation API
- `types/ai-config.ts` and `types/ai-providers.ts` — Provider type definitions

## Supported providers
- **Anthropic** (primary): `claude-sonnet-4-6` via `@anthropic-ai/sdk`
- **OpenAI**: GPT-4 via REST
- **GLM-5** (ZhipuAI): `glm-4-plus` via REST
- **Custom**: Any OpenAI-compatible endpoint

## Guidelines
- Keep provider-specific logic inside `AIService` private methods
- When adding a new provider, add it to the `AIProvider` union type, `configs` map, and a `generateWith*` method
- Prompts should be built in dedicated `build*Prompt()` methods, not inline
- Return structured data from API routes; keep AI logic in `lib/`, not in route handlers
- Test prompt changes against multiple providers when possible
- Use the latest capable Claude model (`claude-sonnet-4-6`) for Anthropic calls
