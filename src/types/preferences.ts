import type { CollapseMode } from '@/web/chat/constants/collapse-modes';

export type { CollapseMode };

export interface Preferences {
  colorScheme: 'light' | 'dark' | 'system';
  language: string;
  toolCollapseMode: CollapseMode;
  notifications?: {
    enabled: boolean;
    ntfyUrl?: string;
  };
}

export const DEFAULT_PREFERENCES: Preferences = {
  colorScheme: 'system',
  language: 'en',
  toolCollapseMode: 'expanded',
};
