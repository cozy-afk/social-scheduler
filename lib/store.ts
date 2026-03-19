import { create } from 'zustand';
import {
  Model, User, Post, Caption, GalleryAsset, VAMagicLink,
  PostReference, StagedAsset, StagedVariant, WorkflowStep, EditingTarget, CropRatio,
  Agency, ResearchGroup,
  // Editing workflow types
  AssetVariant, Platform, CaptionStyle,
} from '@/types/models';
import { ImageEditorResult, ImageEditorResult as EditorResultType } from '@/components/ImageEditor';
import { S3Config, MetaConfig, FanvueConfig } from '@/types/integrations';

// Re-export integration types for convenience
export type { S3Config, MetaConfig, FanvueConfig } from '@/types/integrations';

// Alias to avoid conflict with utils.ImageEditorResult
type StagingEditResult = EditorResultType;

/** Default crop ratios for staging workflow */
const DEFAULT_CROP_RATIOS: { ratio: CropRatio; edited: false }[] = [
  { ratio: '1:1', edited: false },
  { ratio: '4:5', edited: false },
  { ratio: '9:16', edited: false },
];

interface AppState {
  // Current user
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;

  // Agencies
  agencies: Agency[];
  setAgencies: (agencies: Agency[]) => void;
  addAgency: (agency: Agency) => void;
  updateAgency: (id: string, updates: Partial<Agency>) => void;
  deleteAgency: (id: string) => void;

  // All users (for admin management)
  users: User[];
  setUsers: (users: User[]) => void;
  addUser: (user: User) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  syncUserFromSession: (session: { user: { id: string; name: string; email: string; image?: string } }) => User | null;

  // Models
  models: Model[];
  selectedModelId: string | null;
  setModels: (models: Model[]) => void;
  setSelectedModelId: (id: string | null) => void;
  addModel: (model: Model) => void;
  updateModel: (id: string, updates: Partial<Model>) => void;
  deleteModel: (id: string) => void;

  // VA Users
  vaUsers: User[];
  setVAUsers: (users: User[]) => void;
  addVAUser: (user: User) => void;
  updateVAUser: (id: string, updates: Partial<User>) => void;
  deleteVAUser: (id: string) => void;

  // Posts
  posts: Post[];
  setPosts: (posts: Post[]) => void;
  addPost: (post: Post) => void;
  updatePost: (id: string, updates: Partial<Post>) => void;

  // Captions library
  captions: Caption[];
  setCaptions: (captions: Caption[]) => void;
  addCaption: (caption: Caption) => void;

  // Gallery
  galleryAssets: GalleryAsset[];
  setGalleryAssets: (assets: GalleryAsset[]) => void;
  addGalleryAsset: (asset: GalleryAsset) => void;
  removeGalleryAsset: (id: string) => void;

  // Magic links
  magicLinks: VAMagicLink[];
  setMagicLinks: (links: VAMagicLink[]) => void;
  addMagicLink: (link: VAMagicLink) => void;
  revokeMagicLink: (token: string) => void;

  // Integration configs (persisted in memory; real app would use DB)
  s3Config: S3Config | null;
  setS3Config: (config: S3Config | null) => void;
  metaConfig: MetaConfig | null;
  setMetaConfig: (config: MetaConfig | null) => void;
  fanvueConfig: FanvueConfig | null;
  setFanvueConfig: (config: FanvueConfig | null) => void;

  // Post References (replaces captions-as-text for reference posts)
  postReferences: PostReference[];
  setPostReferences: (refs: PostReference[]) => void;
  addPostReference: (ref: PostReference) => void;
  deletePostReference: (id: string) => void;

  // Gallery favorites
  toggleGalleryFavorite: (id: string) => void;

  // Staging workflow
  workflowStep: WorkflowStep;
  setWorkflowStep: (step: WorkflowStep) => void;
  stagedAssets: StagedAsset[];
  setStagedAssets: (assets: GalleryAsset[]) => void;
  updateStagedVariant: (assetId: string, ratio: CropRatio, result: StagedVariant['editResult']) => void;
  skipStagedAsset: (assetId: string) => void;
  clearStaging: () => void;
  editingTarget: EditingTarget | null;
  setEditingTarget: (target: EditingTarget | null) => void;

  // NEW: Editing workflow actions
  updateStagedAssetEdit: (assetId: string, editResult: ImageEditorResult) => void;
  clearStagedAssetEdit: (assetId: string) => void;
  createAssetVariant: (assetId: string, platform: Platform, config: {
    editedUrl?: string;
    editResult?: any;
    imageCaption?: string;
    captionStyle?: CaptionStyle;
  }) => void;
  removeAssetVariant: (assetId: string, variantId: string) => void;
  setPlatformCaption: (assetId: string, platform: Platform, config: { text: string; style: CaptionStyle }) => void;
  clearPlatformCaption: (assetId: string, platform: Platform) => void;
  updateStagedAssetRenderedUrl: (assetId: string, renderedUrl: string) => void;
  updateStagedAssetCaptionText: (assetId: string, captionText: string) => void;

  // Research Groups
  researchGroups: ResearchGroup[];
  setResearchGroups: (groups: ResearchGroup[]) => void;
  addResearchGroup: (group: ResearchGroup) => void;
  updateResearchGroup: (id: string, updates: Partial<ResearchGroup>) => void;
  deleteResearchGroup: (id: string) => void;

  // Approved assets (persisted across pages)
  approvedAssetIds: string[];
  approveAsset: (id: string) => void;
  unapproveAsset: (id: string) => void;
  clearApprovals: () => void;
  setApprovedAssetIds: (ids: string[]) => void;

  // UI state
  showCreatePostModal: boolean;
  setShowCreatePostModal: (show: boolean) => void;
  editingPost: Post | null;
  setEditingPost: (post: Post | null) => void;
  preloadedGalleryAssets: GalleryAsset[];
  setPreloadedGalleryAssets: (assets: GalleryAsset[]) => void;
}

// ─── Selector: Get models filtered by current user role ──────────────────

export function getVisibleModels(state: AppState): Model[] {
  const { currentUser, models } = state;

  if (!currentUser) return [];

  // Admin: see all models
  if (currentUser.role === 'admin') {
    return models;
  }

  // VA: see only assigned models
  if (currentUser.role === 'va') {
    return models.filter((m) => currentUser.assignedModels.includes(m.id));
  }

  // Agency/Planner: see only their agency's models
  if (currentUser.agencyId) {
    return models.filter((m) => m.agencyId === currentUser.agencyId);
  }

  return [];
}

export const useStore = create<AppState>((set) => ({
  // Current user
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),

  // Agencies
  agencies: [],
  setAgencies: (agencies) => set({ agencies }),
  addAgency: (agency) => set((state) => ({ agencies: [...state.agencies, agency] })),
  updateAgency: (id, updates) =>
    set((state) => ({
      agencies: state.agencies.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    })),
  deleteAgency: (id) =>
    set((state) => ({ agencies: state.agencies.filter((a) => a.id !== id) })),

  // All users (for admin management)
  users: [],
  setUsers: (users) => set({ users }),
  addUser: (user) => set((state) => ({ users: [...state.users, user] })),
  updateUser: (id, updates) =>
    set((state) => ({
      users: state.users.map((u) => (u.id === id ? { ...u, ...updates } : u)),
    })),
  deleteUser: (id) =>
    set((state) => ({ users: state.users.filter((u) => u.id !== id) })),
  syncUserFromSession: (session) => {
    const store = useStore.getState();
    // Check if user already exists by Discord ID or email
    const existingUser = store.users.find(
      (u) => u.discordId === session.user.id || u.email === session.user.email
    );

    if (existingUser) {
      // Update last accessed time and sync name if changed
      const updatedUser: User = {
        ...existingUser,
        name: session.user.name,
        email: session.user.email,
        updatedAt: new Date().toISOString(),
      };
      set((state) => ({
        users: state.users.map((u) => (u.id === existingUser.id ? updatedUser : u)),
        currentUser: updatedUser,
      }));
      return updatedUser;
    }

    // Create new user from Discord session (default to 'agency' role)
    const newUser: User = {
      id: `discord-${session.user.id}`,
      email: session.user.email,
      name: session.user.name,
      role: 'agency', // Default role, requires admin approval
      assignedModels: [],
      discordId: session.user.id,
      approvalStatus: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set((state) => ({
      users: [...state.users, newUser],
      currentUser: newUser,
    }));
    return newUser;
  },

  // Models
  models: [],
  selectedModelId: null,
  setModels: (models) => set({ models }),
  setSelectedModelId: (id) => set({ selectedModelId: id }),
  addModel: (model) => set((state) => ({ models: [...state.models, model] })),
  updateModel: (id, updates) =>
    set((state) => ({
      models: state.models.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    })),
  deleteModel: (id) =>
    set((state) => ({
      models: state.models.filter((m) => m.id !== id),
      selectedModelId: state.selectedModelId === id ? null : state.selectedModelId,
    })),

  // VA Users
  vaUsers: [],
  setVAUsers: (users) => set({ vaUsers: users }),
  addVAUser: (user) => set((state) => ({ vaUsers: [...state.vaUsers, user] })),
  updateVAUser: (id, updates) =>
    set((state) => ({
      vaUsers: state.vaUsers.map((u) => (u.id === id ? { ...u, ...updates } : u)),
    })),
  deleteVAUser: (id) =>
    set((state) => ({ vaUsers: state.vaUsers.filter((u) => u.id !== id) })),

  // Posts
  posts: [],
  setPosts: (posts) => set({ posts }),
  addPost: (post) => set((state) => ({ posts: [...state.posts, post] })),
  updatePost: (id, updates) =>
    set((state) => ({
      posts: state.posts.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    })),

  // Captions
  captions: [],
  setCaptions: (captions) => set({ captions }),
  addCaption: (caption) => set((state) => ({ captions: [...state.captions, caption] })),

  // Gallery
  galleryAssets: [],
  setGalleryAssets: (assets) => set({ galleryAssets: assets }),
  addGalleryAsset: (asset) => set((state) => ({ galleryAssets: [asset, ...state.galleryAssets] })),
  removeGalleryAsset: (id) =>
    set((state) => ({ galleryAssets: state.galleryAssets.filter((a) => a.id !== id) })),

  // Magic links
  magicLinks: [],
  setMagicLinks: (links) => set({ magicLinks: links }),
  addMagicLink: (link) => set((state) => ({ magicLinks: [...state.magicLinks, link] })),
  revokeMagicLink: (token) =>
    set((state) => ({
      magicLinks: state.magicLinks.map((l) =>
        l.token === token ? { ...l, isActive: false } : l
      ),
    })),

  // Integration configs
  s3Config: null,
  setS3Config: (config) => set({ s3Config: config }),
  metaConfig: null,
  setMetaConfig: (config) => set({ metaConfig: config }),
  fanvueConfig: null,
  setFanvueConfig: (config) => set({ fanvueConfig: config }),

  // Post References
  postReferences: [],
  setPostReferences: (refs) => set({ postReferences: refs }),
  addPostReference: (ref) => set((state) => ({ postReferences: [ref, ...state.postReferences] })),
  deletePostReference: (id) => set((state) => ({ postReferences: state.postReferences.filter((r) => r.id !== id) })),

  // Gallery favorites
  toggleGalleryFavorite: (id) =>
    set((state) => ({
      galleryAssets: state.galleryAssets.map((a) =>
        a.id === id ? { ...a, favorite: !a.favorite } : a
      ),
    })),

  // Staging workflow
  workflowStep: 'gallery',
  setWorkflowStep: (step) => set({ workflowStep: step }),
  stagedAssets: [],
  setStagedAssets: (assets) =>
    set({
      stagedAssets: assets.map((asset) => ({
        asset,
        variants: [],
        ratioVariants: DEFAULT_CROP_RATIOS.map((v) => ({ ...v })),
        skipped: false,
      })),
      workflowStep: 'scheduling',
    }),
  updateStagedVariant: (assetId, ratio, result) =>
    set((state) => ({
      stagedAssets: state.stagedAssets.map((sa) =>
        sa.asset.id === assetId
          ? {
              ...sa,
              ratioVariants: (sa.ratioVariants || []).map((v) =>
                v.ratio === ratio ? { ...v, edited: true, editResult: result } : v
              ),
            }
          : sa
      ),
    })),
  skipStagedAsset: (assetId) =>
    set((state) => ({
      stagedAssets: state.stagedAssets.map((sa) =>
        sa.asset.id === assetId ? { ...sa, skipped: true } : sa
      ),
    })),
  clearStaging: () => set({ stagedAssets: [], workflowStep: 'gallery', editingTarget: null }),
  editingTarget: null,
  setEditingTarget: (target) => set({ editingTarget: target }),

  // NEW: Editing workflow actions
  updateStagedAssetEdit: (assetId, editResult: StagingEditResult) =>
    set((state) => ({
      stagedAssets: state.stagedAssets.map((sa) =>
        sa.asset.id === assetId
          ? { ...sa, editResult, variants: [] } // Clear old variants when editing changes
          : sa
      ),
    })),
  clearStagedAssetEdit: (assetId) =>
    set((state) => ({
      stagedAssets: state.stagedAssets.map((sa) =>
        sa.asset.id === assetId
          ? { ...sa, editResult: undefined }
          : sa
      ),
    })),
  createAssetVariant: (assetId, platform, config) =>
    set((state) => {
      const variant: AssetVariant = {
        id: `variant-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        originalAssetId: assetId,
        platform,
        editedUrl: config.editedUrl,
        editResult: config.editResult,
        imageCaption: config.imageCaption,
        captionStyle: config.captionStyle,
        createdAt: new Date().toISOString(),
      };
      return {
        stagedAssets: state.stagedAssets.map((sa) =>
          sa.asset.id === assetId
            ? { ...sa, variants: [...(sa.variants || []), variant] }
            : sa
        ),
      };
    }),
  removeAssetVariant: (assetId, variantId) =>
    set((state) => ({
      stagedAssets: state.stagedAssets.map((sa) =>
        sa.asset.id === assetId
          ? { ...sa, variants: sa.variants.filter((v) => v.id !== variantId) }
          : sa
      ),
    })),
  setPlatformCaption: (assetId, platform, config) =>
    set((state) => ({
      stagedAssets: state.stagedAssets.map((sa) =>
        sa.asset.id === assetId
          ? {
              ...sa,
              platformCaptions: {
                ...(sa.platformCaptions || {}),
                [platform]: config,
              },
            }
          : sa
      ),
    })),
  clearPlatformCaption: (assetId, platform) =>
    set((state) => {
      const newCaptions = { ...state.stagedAssets.find((sa) => sa.asset.id === assetId)?.platformCaptions };
      if (newCaptions) {
        delete newCaptions[platform];
      }
      return {
        stagedAssets: state.stagedAssets.map((sa) =>
          sa.asset.id === assetId
            ? { ...sa, platformCaptions: newCaptions }
            : sa
        ),
      };
    }),

  updateStagedAssetRenderedUrl: (assetId, renderedUrl) =>
    set((state) => ({
      stagedAssets: state.stagedAssets.map((sa) =>
        sa.asset.id === assetId ? { ...sa, renderedUrl } : sa
      ),
    })),
  updateStagedAssetCaptionText: (assetId, captionText) =>
    set((state) => ({
      stagedAssets: state.stagedAssets.map((sa) =>
        sa.asset.id === assetId ? { ...sa, captionText } : sa
      ),
    })),

  // Research Groups
  researchGroups: [],
  setResearchGroups: (groups) => set({ researchGroups: groups }),
  addResearchGroup: (group) => set((state) => ({ researchGroups: [...state.researchGroups, group] })),
  updateResearchGroup: (id, updates) =>
    set((state) => ({
      researchGroups: state.researchGroups.map((g) => (g.id === id ? { ...g, ...updates } : g)),
    })),
  deleteResearchGroup: (id) =>
    set((state) => ({ researchGroups: state.researchGroups.filter((g) => g.id !== id) })),

  // Approved assets
  approvedAssetIds: [],
  approveAsset: (id) => set((state) => ({
    approvedAssetIds: state.approvedAssetIds.includes(id) ? state.approvedAssetIds : [...state.approvedAssetIds, id],
  })),
  unapproveAsset: (id) => set((state) => ({
    approvedAssetIds: state.approvedAssetIds.filter((a) => a !== id),
  })),
  clearApprovals: () => set({ approvedAssetIds: [] }),
  setApprovedAssetIds: (ids) => set({ approvedAssetIds: ids }),

  // UI
  showCreatePostModal: false,
  setShowCreatePostModal: (show) => set({ showCreatePostModal: show }),
  editingPost: null,
  setEditingPost: (post) => set({ editingPost: post }),
  preloadedGalleryAssets: [],
  setPreloadedGalleryAssets: (assets) => set({ preloadedGalleryAssets: assets }),
}));
