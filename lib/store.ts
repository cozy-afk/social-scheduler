import { create } from 'zustand';
import { Model, User, Post, Caption, GalleryAsset, VAMagicLink } from '@/types/models';

interface AppState {
  // Current user
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;

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

  // UI state
  showCreatePostModal: boolean;
  setShowCreatePostModal: (show: boolean) => void;
  editingPost: Post | null;
  setEditingPost: (post: Post | null) => void;
  preloadedGalleryAssets: GalleryAsset[];
  setPreloadedGalleryAssets: (assets: GalleryAsset[]) => void;
}

export const useStore = create<AppState>((set) => ({
  // Current user
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),

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

  // UI
  showCreatePostModal: false,
  setShowCreatePostModal: (show) => set({ showCreatePostModal: show }),
  editingPost: null,
  setEditingPost: (post) => set({ editingPost: post }),
  preloadedGalleryAssets: [],
  setPreloadedGalleryAssets: (assets) => set({ preloadedGalleryAssets: assets }),
}));
