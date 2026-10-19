declare global {
  interface Window {
    posthog?: {
      capture: (event: string, properties?: Record<string, unknown>) => void;
      opt_in_capturing: (options?: { captureEventName?: string | false | null; captureProperties?: Record<string, unknown> }) => void;
      opt_out_capturing: () => void;
      startSessionRecording: () => void;
    };
  }
}

export {};
