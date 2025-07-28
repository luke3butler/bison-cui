import type { CollapseMode } from '../constants/collapse-modes';

// TypeScript ensures this object has ALL modes and ONLY valid modes
type CollapseModeUI = Record<CollapseMode, {
  label: string;
  description: string;
  icon: 'chevron-down' | 'code' | 'chevron-right';
}>;

// UI configuration for each collapse mode
export const COLLAPSE_MODE_UI: CollapseModeUI = {
  expanded: { 
    label: 'Expand All', 
    description: 'All tools expanded by default', 
    icon: 'chevron-down' 
  },
  smart: { 
    label: 'Smart Collapse', 
    description: 'Code tools collapsed, others expanded', 
    icon: 'code' 
  },
  collapsed: { 
    label: 'Collapse All', 
    description: 'All tools collapsed by default', 
    icon: 'chevron-right' 
  }
};