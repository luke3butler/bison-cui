import type { CollapseMode } from '../constants/collapse-modes';

// Tools that produce code/output content
export const CODE_OUTPUT_TOOLS = new Set([
  'Edit',
  'MultiEdit', 
  'Write',
  'Bash',
  'Glob',
  'LS'
]);

// Utility function to calculate default collapsed state
export const getToolDefaultCollapsed = (mode: CollapseMode, toolName: string): boolean => {
  switch (mode) {
    case 'expanded':
      return false;
    case 'smart':
      return CODE_OUTPUT_TOOLS.has(toolName);
    case 'collapsed':
      return true;
    default:
      return false;
  }
};