'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { mockModels, mockAdmin, mockPostReferences } from '@/lib/mockData';
import { CaptionCategory, PostReference } from '@/types/models';
import {
  Plus,
  Upload,
  Sparkles,
  ChevronRight,
  X as XIcon,
  Loader2,
  Check,
  Copy,
  Camera,
  Wand2,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { GeneratedCaption } from '@/app/api/generate-captions/route';
import PostReferenceCard from '@/components/PostReferenceCard';
import PostReferenceImporter from '@/components/PostReferenceImporter';
import { InstagramIcon, TikTokIcon, XIcon as XPlatformIcon, ThreadsIcon } from '@/components/PlatformIcons';

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<
  CaptionCategory,
  { label: string; icon: React.ReactNode; description: string; color: string }
> = {
  ig_reels: {
    label: 'IG Reels',
    icon: <InstagramIcon size={20} />,
    description: 'Short, engaging captions for Instagram Reels',
    color: 'border-pink-500/40 bg-pink-500/10',
  },
  ig_post: {
    label: 'IG Post',
    icon: <InstagramIcon size={20} />,
    description: 'Carousel and single image post descriptions',
    color: 'border-pink-400/40 bg-pink-400/10',
  },
  tiktok_slideshow: {
    label: 'TikTok Slideshow',
    icon: <TikTokIcon size={20} />,
    description: 'Text that goes directly ON each slide image',
    color: 'border-red-500/40 bg-red-500/10',
  },
  tiktok_reel: {
    label: 'TikTok Reels',
    icon: <TikTokIcon size={20} />,
    description: 'Short captions for TikTok video posts',
    color: 'border-red-400/40 bg-red-400/10',
  },
  threads_post: {
    label: 'Threads',
    icon: <ThreadsIcon size={20} />,
    description: 'Conversational post text for Threads',
    color: 'border-white/40 bg-white/10',
  },
  x_post: {
    label: 'X (Twitter)',
    icon: <XPlatformIcon size={20} />,
    description: 'Promotional tweets and post text',
    color: 'border-white/40 bg-white/10',
  },
  general: {
    label: 'General',
    icon: <Sparkles size={20} />,
    description: 'Multi-platform references',
    color: 'border-blue-500/40 bg-blue-500/10',
  },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CaptionsPage() {
  const {
    setModels,
    selectedModelId,
    setSelectedModelId,
    setCurrentUser,
    postReferences,
    setPostReferences,
    addPostReference,
    deletePostReference,
  } = useStore();

  const [activeCategory, setActiveCategory] = useState<CaptionCategory>('ig_reels');
  const [showImporter, setShowImporter] = useState(false);
  const [importerCategory, setImporterCategory] = useState<CaptionCategory>('ig_reels');

  // Strategy analysis
  const [showStrategy, setShowStrategy] = useState(false);
  const [strategyLoading, setStrategyLoading] = useState(false);
  const [strategyBrief, setStrategyBrief] = useState<string[] | null>(null);
  const [promptTemplate, setPromptTemplate] = useState<string | null>(null);
  const [strategyError, setStrategyError] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Caption generation
  const [showGenerate, setShowGenerate] = useState(false);
  const [genPlatform, setGenPlatform] = useState<string>('tiktok');
  const [genPostType, setGenPostType] = useState<string>('tiktok_reel');
  const [genCount, setGenCount] = useState(5);
  const [genContext, setGenContext] = useState('');
  const [genLoading, setGenLoading] = useState(false);
  const [genResults, setGenResults] = useState<GeneratedCaption[] | null>(null);
  const [genFramework, setGenFramework] = useState('');
  const [genError, setGenError] = useState<string | null>(null);
  const [expandedGen, setExpandedGen] = useState<Set<number>>(new Set());

  useEffect(() => {
    setModels(mockModels);
    if (!selectedModelId) setSelectedModelId(mockModels[0].id);
    setCurrentUser(mockAdmin);
    setPostReferences(mockPostReferences);
  }, [setModels, setSelectedModelId, setCurrentUser, setPostReferences]);

  // ── Computed ────────────────────────────────────────────────────────────────

  const visibleRefs = postReferences.filter((r) => r.category === activeCategory);

  const categoryCounts = (Object.keys(CATEGORY_CONFIG) as CaptionCategory[]).reduce(
    (acc, cat) => {
      acc[cat] = postReferences.filter((r) => r.category === cat).length;
      return acc;
    },
    {} as Record<CaptionCategory, number>
  );

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleAnalyzeStrategy = async () => {
    setStrategyLoading(true);
    setShowStrategy(true);
    setStrategyBrief(null);
    setPromptTemplate(null);
    setStrategyError(null);

    const mappedCaptions = postReferences.map((r) => ({
      text: `${r.caption} ${r.description}`.trim(),
      performanceRating: r.performanceRating,
      tags: r.tags,
      platform: r.sourcePlatform === 'unknown' ? 'instagram' : r.sourcePlatform,
      postType: 'instagram_post',
      category: r.category,
    }));

    try {
      const res = await fetch('/api/analyze-captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ captions: mappedCaptions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setStrategyBrief(data.strategyBrief);
      setPromptTemplate(data.promptTemplate);
    } catch (e: unknown) {
      setStrategyError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setStrategyLoading(false);
    }
  };

  const handleCopyPrompt = () => {
    if (!promptTemplate) return;
    navigator.clipboard.writeText(promptTemplate).catch(() => {});
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleOpenImporter = (category: CaptionCategory) => {
    setImporterCategory(category);
    setShowImporter(true);
  };

  const handleSaveRef = (ref: PostReference) => {
    addPostReference(ref);
  };

  const handleGenerate = async () => {
    if (postReferences.length === 0) {
      setGenError('Add at least one reference caption before generating.');
      return;
    }
    setGenLoading(true);
    setGenResults(null);
    setGenFramework('');
    setGenError(null);
    try {
      const res = await fetch('/api/generate-captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postReferences,
          platform: genPlatform,
          postType: genPostType,
          count: genCount,
          context: genContext.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setGenResults(data.data.captions);
      setGenFramework(data.data.framework ?? '');
    } catch (e: unknown) {
      setGenError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setGenLoading(false);
    }
  };

  const handleAddGenerated = (cap: GeneratedCaption) => {
    const platformMap: Record<string, string> = {
      tiktok: 'tiktok', instagram: 'instagram', threads: 'threads', x: 'x',
    };
    addPostReference({
      id: `gen-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      coverImageUrl: null,
      caption: cap.imageCaption,
      description: cap.description,
      imageCaption: cap.imageCaption,
      sourcePlatform: (platformMap[genPlatform] ?? 'unknown') as any,
      category: activeCategory,
      tags: ['ai-generated'],
      performanceRating: undefined,
      createdAt: new Date().toISOString(),
    });
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen">
      <main className="max-w-5xl mx-auto px-6 py-6">

        {/* Page header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">Post References</h2>
            <p className="text-sm text-slate-400 mt-1">
              Save high-performing posts as references for your content strategy
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => handleOpenImporter(activeCategory)}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Upload className="w-4 h-4" />
              Import
            </button>
            <button
              onClick={handleAnalyzeStrategy}
              disabled={strategyLoading}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-lg transition-all duration-150 active:scale-95 text-sm"
            >
              {strategyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {strategyLoading ? 'Analyzing…' : 'Analyze Strategy'}
            </button>
            <button
              onClick={() => { setShowGenerate(!showGenerate); setGenResults(null); }}
              className="flex items-center gap-2 text-white font-medium px-4 py-2 rounded-lg transition-all duration-150 active:scale-95 text-sm"
              style={{ background: showGenerate ? 'rgba(124,58,237,0.4)' : 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)' }}
            >
              <Wand2 className="w-4 h-4 text-violet-300" />
              Generate
            </button>
          </div>
        </div>

        {/* Strategy Analysis Panel */}
        {showStrategy && (
          <div className="card p-5 mb-6 border-violet-500/30 bg-violet-500/5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-400" />
                Reference Strategy Analysis
              </h3>
              <button
                onClick={() => setShowStrategy(false)}
                className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            {strategyLoading && (
              <div className="flex items-center gap-3 text-slate-400 text-sm py-4">
                <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
                Analyzing {postReferences.length} post references across platforms…
              </div>
            )}

            {strategyError && (
              <p className="text-red-400 text-sm">{strategyError}</p>
            )}

            {strategyBrief && strategyBrief.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  What's Working
                </p>
                <ul className="space-y-2">
                  {strategyBrief.map((point, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-200">
                      <ChevronRight className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {promptTemplate && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Reusable Caption Prompt
                  </p>
                  <button
                    onClick={handleCopyPrompt}
                    className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    {copiedPrompt ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
                  {promptTemplate}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Paste this prompt into the AI Suggestions field when creating posts to generate
                  on-brand captions.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Generate Panel ────────────────────────────────────────────────── */}
        {showGenerate && (
          <div className="card p-5 mb-6 space-y-4" style={{ border: '1px solid rgba(124,58,237,0.3)', background: 'rgba(124,58,237,0.05)' }}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-violet-400" />
                Generate Captions (HBSO Framework)
              </h3>
              <button onClick={() => setShowGenerate(false)} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            {genFramework && (
              <div className="text-xs text-violet-300 px-3 py-2 rounded-lg" style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.25)' }}>
                <span className="font-semibold">Detected pattern:</span> {genFramework}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {/* Platform */}
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1 block">Platform</label>
                <select
                  value={genPlatform}
                  onChange={(e) => {
                    setGenPlatform(e.target.value);
                    const defaults: Record<string, string> = { tiktok: 'tiktok_reel', instagram: 'instagram_reel', threads: 'threads_post', x: 'x_post' };
                    setGenPostType(defaults[e.target.value] ?? 'tiktok_reel');
                  }}
                  className="w-full rounded-lg px-2 py-1.5 text-sm text-white"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }}
                >
                  <option value="tiktok">TikTok</option>
                  <option value="instagram">Instagram</option>
                  <option value="threads">Threads</option>
                  <option value="x">X</option>
                </select>
              </div>
              {/* Post type */}
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1 block">Type</label>
                <select
                  value={genPostType}
                  onChange={(e) => setGenPostType(e.target.value)}
                  className="w-full rounded-lg px-2 py-1.5 text-sm text-white"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }}
                >
                  {genPlatform === 'tiktok' && <><option value="tiktok_reel">Reel</option><option value="tiktok_slideshow">Slideshow</option></>}
                  {genPlatform === 'instagram' && <><option value="instagram_reel">Reel</option><option value="instagram_post">Post</option></>}
                  {genPlatform === 'threads' && <option value="threads_post">Post</option>}
                  {genPlatform === 'x' && <option value="x_post">Post</option>}
                </select>
              </div>
              {/* Count */}
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1 block">Count: {genCount}</label>
                <input
                  type="range" min={1} max={10} value={genCount}
                  onChange={(e) => setGenCount(Number(e.target.value))}
                  className="w-full accent-violet-500"
                />
              </div>
              {/* Generate button */}
              <div className="flex items-end">
                <button
                  onClick={handleGenerate}
                  disabled={genLoading}
                  className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-40"
                  style={{ background: 'rgba(124,58,237,0.8)' }}
                >
                  {genLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                  {genLoading ? 'Generating…' : 'Generate'}
                </button>
              </div>
            </div>

            {/* Extra context */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1 block">Extra instruction (optional)</label>
              <input
                type="text"
                value={genContext}
                onChange={(e) => setGenContext(e.target.value)}
                placeholder='e.g. "make them spicier" or "focus on the friendship angle"'
                className="w-full rounded-lg px-3 py-2 text-sm text-white"
                style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none' }}
              />
            </div>

            {genError && <p className="text-red-400 text-sm">{genError}</p>}

            {/* Results */}
            {genResults && genResults.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {genResults.length} Generated Caption{genResults.length !== 1 ? 's' : ''}
                </p>
                {genResults.map((cap, i) => {
                  const isExpanded = expandedGen.has(i);
                  return (
                    <div key={i} className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div className="flex items-start gap-3 p-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white italic">"{cap.imageCaption}"</p>
                          <p className="text-xs text-slate-400 mt-1">{cap.description}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => setExpandedGen((prev) => {
                              const next = new Set(prev);
                              next.has(i) ? next.delete(i) : next.add(i);
                              return next;
                            })}
                            className="btn-icon text-xs"
                            title="Show HBSO breakdown"
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => navigator.clipboard.writeText(`${cap.imageCaption}\n\n${cap.description}`).catch(() => {})}
                            className="btn-icon text-xs"
                            title="Copy"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleAddGenerated(cap)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold text-violet-300 transition-all"
                            style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)' }}
                            title="Add to library"
                          >
                            <Plus className="w-3 h-3" />
                            Add
                          </button>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="px-3 pb-3 space-y-1.5 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                          <div className="flex gap-2 mt-2">
                            <span className="text-[10px] font-bold text-violet-400 w-12 flex-shrink-0">HOOK</span>
                            <p className="text-xs text-slate-300">{cap.hook}</p>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-[10px] font-bold text-amber-400 w-12 flex-shrink-0">BAIT</span>
                            <p className="text-xs text-slate-300">{cap.bait}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-6">
          {(
            Object.entries(CATEGORY_CONFIG) as [
              CaptionCategory,
              (typeof CATEGORY_CONFIG)[CaptionCategory]
            ][]
          ).map(([cat, cfg]) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium whitespace-nowrap transition-all duration-150 flex-shrink-0 ${
                activeCategory === cat
                  ? `${cfg.color} text-slate-100`
                  : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:border-slate-600 hover:bg-slate-800'
              }`}
            >
              <span>{cfg.icon}</span>
              <span>{cfg.label}</span>
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeCategory === cat ? 'bg-white/20' : 'bg-slate-700 text-slate-400'
                }`}
              >
                {categoryCounts[cat]}
              </span>
            </button>
          ))}
        </div>

        {/* Active Category Header */}
        <div className={`rounded-xl border p-4 mb-4 ${CATEGORY_CONFIG[activeCategory].color}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{CATEGORY_CONFIG[activeCategory].icon}</span>
              <div>
                <h3 className="font-semibold text-white">{CATEGORY_CONFIG[activeCategory].label}</h3>
                <p className="text-xs text-slate-400">
                  {CATEGORY_CONFIG[activeCategory].description}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleOpenImporter(activeCategory)}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Reference
            </button>
          </div>
        </div>

        {/* Cards grid or empty state */}
        {visibleRefs.length === 0 ? (
          <div className="card py-14 flex flex-col items-center text-center">
            <Camera className="w-10 h-10 text-slate-700 mb-3" />
            <p className="text-slate-400 font-medium">No post references yet</p>
            <p className="text-slate-600 text-sm mt-1">
              Import from a screenshot or link to get started
            </p>
            <button
              onClick={() => handleOpenImporter(activeCategory)}
              className="btn-secondary flex items-center gap-2 text-sm mt-4"
            >
              <Upload className="w-4 h-4" />
              Import Reference
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {visibleRefs.map((ref) => (
              <PostReferenceCard
                key={ref.id}
                ref_={ref}
                onDelete={deletePostReference}
              />
            ))}
          </div>
        )}
      </main>

      {/* Post Reference Importer Modal */}
      {showImporter && (
        <PostReferenceImporter
          defaultCategory={importerCategory}
          onSave={handleSaveRef}
          onClose={() => setShowImporter(false)}
        />
      )}
    </div>
  );
}
