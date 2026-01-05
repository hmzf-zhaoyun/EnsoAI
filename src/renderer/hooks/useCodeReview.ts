import { useCallback } from 'react';
import {
  startCodeReview,
  stopCodeReview,
  useCodeReviewContinueStore,
} from '@/stores/codeReviewContinue';
import { useSettingsStore } from '@/stores/settings';

interface UseCodeReviewOptions {
  repoPath: string | undefined;
}

interface UseCodeReviewReturn {
  content: string;
  status: 'idle' | 'initializing' | 'streaming' | 'complete' | 'error';
  error: string | null;
  cost: number | null;
  model: string | null;
  sessionId: string | null;
  canContinue: boolean;
  startReview: () => Promise<void>;
  stopReview: () => void;
  reset: () => void;
}

export function useCodeReview({ repoPath }: UseCodeReviewOptions): UseCodeReviewReturn {
  const codeReviewSettings = useSettingsStore((s) => s.codeReview);
  const review = useCodeReviewContinueStore((s) => s.review);
  const resetReview = useCodeReviewContinueStore((s) => s.resetReview);

  const startReview = useCallback(async () => {
    if (!repoPath) return;

    await startCodeReview(repoPath, {
      model: codeReviewSettings.model,
      language: codeReviewSettings.language ?? '中文',
      continueConversation: codeReviewSettings.continueConversation ?? true,
    });
  }, [
    repoPath,
    codeReviewSettings.model,
    codeReviewSettings.language,
    codeReviewSettings.continueConversation,
  ]);

  const continueConversation = codeReviewSettings.continueConversation ?? true;

  return {
    content: review.content,
    status: review.status,
    error: review.error,
    cost: review.cost,
    model: review.model,
    sessionId: review.sessionId,
    canContinue: continueConversation && review.sessionId !== null,
    startReview,
    stopReview: stopCodeReview,
    reset: resetReview,
  };
}
