// This array is the single source of truth for all collapse modes
export const COLLAPSE_MODE_VALUES = ['expanded', 'smart', 'collapsed'] as const;

// Type automatically derived from array - stays in sync automatically
export type CollapseMode = typeof COLLAPSE_MODE_VALUES[number];