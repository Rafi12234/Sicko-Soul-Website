import { create } from "zustand";

export type CursorVariant = "default" | "hover" | "hidden";

interface AppState {
  /** Flipped by the Preloader panel-wipe; sections wait on this before revealing. */
  hasEntered: boolean;
  setHasEntered: (value: boolean) => void;

  cursorVariant: CursorVariant;
  setCursorVariant: (variant: CursorVariant) => void;

  isMenuOpen: boolean;
  toggleMenu: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  hasEntered: false,
  setHasEntered: (hasEntered) => set({ hasEntered }),

  cursorVariant: "default",
  setCursorVariant: (cursorVariant) => set({ cursorVariant }),

  isMenuOpen: false,
  toggleMenu: () => set((state) => ({ isMenuOpen: !state.isMenuOpen })),
}));
