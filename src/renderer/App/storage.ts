import type { TabId } from './constants';

// Storage keys
export const STORAGE_KEYS = {
  REPOSITORIES: 'enso-repositories',
  SELECTED_REPO: 'enso-selected-repo',
  ACTIVE_WORKTREE: 'enso-active-worktree',
  WORKTREE_TABS: 'enso-worktree-tabs',
  REPOSITORY_WIDTH: 'enso-repository-width',
  WORKTREE_WIDTH: 'enso-worktree-width',
  REPOSITORY_COLLAPSED: 'enso-repository-collapsed',
  WORKTREE_COLLAPSED: 'enso-worktree-collapsed',
} as const;

// Helper to get initial value from localStorage
export const getStoredNumber = (key: string, defaultValue: number): number => {
  const saved = localStorage.getItem(key);
  return saved ? Number(saved) : defaultValue;
};

export const getStoredBoolean = (key: string, defaultValue: boolean): boolean => {
  const saved = localStorage.getItem(key);
  return saved !== null ? saved === 'true' : defaultValue;
};

export const getStoredTabMap = (): Record<string, TabId> => {
  const saved = localStorage.getItem(STORAGE_KEYS.WORKTREE_TABS);
  if (saved) {
    try {
      return JSON.parse(saved) as Record<string, TabId>;
    } catch {
      return {};
    }
  }
  return {};
};

// Normalize path for comparison (handles Windows case-insensitivity and trailing slashes)
export const normalizePath = (path: string): string => {
  // Remove trailing slashes/backslashes
  let normalized = path.replace(/[\\/]+$/, '');
  // On Windows, normalize to lowercase for case-insensitive comparison
  if (navigator.platform.startsWith('Win')) {
    normalized = normalized.toLowerCase();
  }
  return normalized;
};

// Check if two paths are equal (considering OS-specific rules)
export const pathsEqual = (path1: string, path2: string): boolean => {
  return normalizePath(path1) === normalizePath(path2);
};
