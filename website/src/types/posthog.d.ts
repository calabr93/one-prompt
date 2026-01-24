declare global {
  interface Window {
    posthog?: {
      __loaded?: boolean;
      init: (key: string, options: Record<string, unknown>) => void;
      capture: (event: string, properties?: Record<string, unknown>) => void;
      register: (properties: Record<string, unknown>) => void;
      startSessionRecording: () => void;
    };
  }
}

export {};
