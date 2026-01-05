import { create } from 'zustand';
import { type ReviewStatus, type StreamEvent, StreamJsonParser } from '@/lib/stream-json-parser';

interface CodeReviewState {
  content: string;
  status: ReviewStatus;
  error: string | null;
  cost: number | null;
  model: string | null;
  sessionId: string | null;
  repoPath: string | null;
  reviewId: string | null;
}

interface CodeReviewContinueState {
  pendingSessionId: string | null;
  shouldSwitchToChat: boolean;
  isMinimized: boolean;

  review: CodeReviewState;

  requestContinue: (sessionId: string) => void;
  clearRequest: () => void;
  clearTabSwitch: () => void;

  minimize: () => void;
  restore: () => void;

  updateReview: (partial: Partial<CodeReviewState>) => void;
  appendContent: (text: string) => void;
  resetReview: () => void;
  setReviewId: (reviewId: string | null) => void;
}

const initialReviewState: CodeReviewState = {
  content: '',
  status: 'idle',
  error: null,
  cost: null,
  model: null,
  sessionId: null,
  repoPath: null,
  reviewId: null,
};

export const useCodeReviewContinueStore = create<CodeReviewContinueState>((set, get) => ({
  pendingSessionId: null,
  shouldSwitchToChat: false,
  isMinimized: false,
  review: { ...initialReviewState },

  requestContinue: (sessionId) => set({ pendingSessionId: sessionId, shouldSwitchToChat: true }),
  clearRequest: () => set({ pendingSessionId: null }),
  clearTabSwitch: () => set({ shouldSwitchToChat: false }),

  minimize: () => set({ isMinimized: true }),
  restore: () => set({ isMinimized: false }),

  updateReview: (partial) =>
    set((state) => ({
      review: { ...state.review, ...partial },
    })),

  appendContent: (text) =>
    set((state) => ({
      review: { ...state.review, content: state.review.content + text },
    })),

  resetReview: () =>
    set({
      review: { ...initialReviewState },
      isMinimized: false,
    }),

  setReviewId: (reviewId) =>
    set((state) => ({
      review: { ...state.review, reviewId },
    })),
}));

const parserInstance = new StreamJsonParser();
let cleanupFn: (() => void) | null = null;

function handleEvent(event: StreamEvent) {
  const store = useCodeReviewContinueStore.getState();

  if (StreamJsonParser.isInitEvent(event)) {
    store.updateReview({ status: 'streaming' });
    return;
  }

  const text = StreamJsonParser.extractTextDelta(event);
  if (text) {
    store.appendContent(text);
  }

  if (StreamJsonParser.isMessageEndEvent(event)) {
    store.appendContent('\n\n');
  }

  if (StreamJsonParser.isResultEvent(event)) {
    const totalCost = StreamJsonParser.extractCost(event);
    const modelName = StreamJsonParser.extractModel(event);
    store.updateReview({
      status: 'complete',
      cost: totalCost,
      model: modelName,
    });
  }

  if (StreamJsonParser.isErrorEvent(event)) {
    store.updateReview({
      status: 'error',
      error: event.message?.toString() || 'Unknown error',
    });
  }
}

export async function startCodeReview(
  repoPath: string,
  settings: {
    model: string;
    language: string;
    continueConversation: boolean;
  }
): Promise<void> {
  const store = useCodeReviewContinueStore.getState();

  store.updateReview({
    content: '',
    status: 'initializing',
    error: null,
    cost: null,
    model: null,
    sessionId: null,
    repoPath,
  });
  parserInstance.reset();

  if (cleanupFn) {
    cleanupFn();
    cleanupFn = null;
  }

  const reviewId = `review-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  store.setReviewId(reviewId);

  const shouldContinue = settings.continueConversation ?? true;
  const claudeSessionId = shouldContinue ? crypto.randomUUID() : undefined;

  const onDataCleanup = window.electronAPI.git.onCodeReviewData((event) => {
    if (event.reviewId !== reviewId) return;

    const currentReviewId = useCodeReviewContinueStore.getState().review.reviewId;
    if (currentReviewId !== reviewId) return;

    if (event.type === 'data' && event.data) {
      const events = parserInstance.parse(event.data);
      for (const e of events) {
        handleEvent(e);
      }
    } else if (event.type === 'error' && event.data) {
      console.warn('[CodeReview stderr]', event.data);
    } else if (event.type === 'exit') {
      const currentStatus = useCodeReviewContinueStore.getState().review.status;
      if (event.exitCode !== 0 && currentStatus !== 'complete') {
        store.updateReview({
          status: 'error',
          error: `Process exited with code ${event.exitCode}`,
        });
      } else if (currentStatus !== 'error') {
        store.updateReview({ status: 'complete' });
      }
      store.setReviewId(null);
    }
  });
  cleanupFn = onDataCleanup;

  try {
    const result = await window.electronAPI.git.startCodeReview(repoPath, {
      model: settings.model,
      language: settings.language ?? '中文',
      continueConversation: shouldContinue,
      sessionId: claudeSessionId,
      reviewId,
    });

    if (!result.success) {
      store.updateReview({
        status: 'error',
        error: result.error || 'Failed to start review',
      });
      stopCodeReview();
    } else if (result.sessionId) {
      store.updateReview({ sessionId: result.sessionId });
    }
  } catch (err) {
    store.updateReview({
      status: 'error',
      error: err instanceof Error ? err.message : 'Failed to start review',
    });
    stopCodeReview();
  }
}

export function stopCodeReview(): void {
  const store = useCodeReviewContinueStore.getState();
  const reviewId = store.review.reviewId;

  if (cleanupFn) {
    cleanupFn();
    cleanupFn = null;
  }

  if (reviewId) {
    window.electronAPI.git.stopCodeReview(reviewId).catch(console.error);
    store.setReviewId(null);
  }

  store.updateReview({ status: 'idle' });
}
