import type { ToolCollapsePreferences } from '../types';

// Reusable constants for maintainability
export const DEFAULT_COLLAPSED_TOOLS = ['ReadTool', 'SearchTool', 'WebTool', 'FallbackTool'];

export const ALL_COLLAPSIBLE_TOOLS = [
  'ReadTool', 'SearchTool', 'WebTool', 'FallbackTool', 
  'BashTool', 'EditTool', 'WriteTool', 'PlanTool'
];

export const MINIMAL_COLLAPSED_TOOLS = ALL_COLLAPSIBLE_TOOLS.filter(tool => tool !== 'PlanTool');

export function isToolCollapsedByDefault(
  toolName: string, 
  preferences?: ToolCollapsePreferences
): boolean {
  const prefs = preferences || { preset: 'default' };
  
  switch (prefs.preset) {
    case 'default': 
      return DEFAULT_COLLAPSED_TOOLS.includes(toolName);
    case 'minimal': 
      return MINIMAL_COLLAPSED_TOOLS.includes(toolName);
    case 'custom': 
      return (prefs.customCollapsed || DEFAULT_COLLAPSED_TOOLS).includes(toolName);
    default:
      // Fallback for unknown preset values
      console.warn(`Unknown tool collapse preset: ${prefs.preset}, falling back to default`);
      return DEFAULT_COLLAPSED_TOOLS.includes(toolName);
  }
}