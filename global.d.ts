/// <reference types="nativewind/types" />

declare global {
  var __DEV__: boolean;
  
  interface Window {
    resetStorage?: () => Promise<void>;
    resetOnboarding?: () => Promise<void>;
    showStorage?: () => Promise<void>;
  }
}

export {};
