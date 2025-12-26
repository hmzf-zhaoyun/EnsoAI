import { useMutation, useQuery } from '@tanstack/react-query';

export function useDetectedApps() {
  return useQuery({
    queryKey: ['apps', 'detected'],
    queryFn: async () => {
      return await window.electronAPI.appDetector.detectApps();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

export function useOpenWith() {
  return useMutation({
    mutationFn: async ({
      path,
      bundleId,
      options,
    }: {
      path: string;
      bundleId: string;
      options?: {
        line?: number;
        workspacePath?: string;
        openFiles?: string[];
        activeFile?: string;
      };
    }) => {
      await window.electronAPI.appDetector.openWith(path, bundleId, options);
    },
  });
}
