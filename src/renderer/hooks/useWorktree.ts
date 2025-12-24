import type { WorktreeCreateOptions, WorktreeRemoveOptions } from '@shared/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useWorktreeStore } from '@/stores/worktree';

export function useWorktreeList(workdir: string | null) {
  const setWorktrees = useWorktreeStore((s) => s.setWorktrees);
  const setError = useWorktreeStore((s) => s.setError);

  return useQuery({
    queryKey: ['worktree', 'list', workdir],
    queryFn: async () => {
      if (!workdir) return [];
      try {
        const worktrees = await window.electronAPI.worktree.list(workdir);
        setWorktrees(worktrees);
        setError(null);
        return worktrees;
      } catch (error) {
        // Handle not a git repository error
        setError(error instanceof Error ? error.message : 'Failed to load worktrees');
        setWorktrees([]);
        return [];
      }
    },
    enabled: !!workdir,
    retry: false, // Don't retry on git errors
  });
}

export function useWorktreeCreate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workdir,
      options,
    }: {
      workdir: string;
      options: WorktreeCreateOptions;
    }) => {
      await window.electronAPI.worktree.add(workdir, options);
    },
    onSuccess: (_, { workdir }) => {
      queryClient.invalidateQueries({ queryKey: ['worktree', 'list', workdir] });
    },
  });
}

export function useWorktreeRemove() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workdir,
      options,
    }: {
      workdir: string;
      options: WorktreeRemoveOptions;
    }) => {
      await window.electronAPI.worktree.remove(workdir, options);
    },
    onSuccess: (_, { workdir }) => {
      queryClient.invalidateQueries({ queryKey: ['worktree', 'list', workdir] });
    },
  });
}
