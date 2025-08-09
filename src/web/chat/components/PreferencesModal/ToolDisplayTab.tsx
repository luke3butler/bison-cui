import React from 'react';
import { usePreferences } from '../../hooks/usePreferences';
import { ALL_COLLAPSIBLE_TOOLS, DEFAULT_COLLAPSED_TOOLS } from '../../utils/tool-collapse';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';

export function ToolDisplayTab() {
  const { preferences, update } = usePreferences();
  const toolPrefs = preferences?.toolCollapse || { preset: 'default' };

  const handlePresetChange = async (preset: 'default' | 'minimal' | 'custom') => {
    await update({ 
      toolCollapse: { 
        preset,
        // When switching to custom, pre-populate with default collapsed tools if no custom selection exists
        ...(preset === 'custom' ? { 
          customCollapsed: toolPrefs.customCollapsed || DEFAULT_COLLAPSED_TOOLS 
        } : {})
      }
    });
  };

  const handleCustomToolToggle = async (toolName: string, checked: boolean) => {
    const currentCustom = toolPrefs.customCollapsed || [];
    const newCustom = checked 
      ? [...currentCustom.filter(t => t !== toolName), toolName]
      : currentCustom.filter(t => t !== toolName);
    
    await update({
      toolCollapse: {
        preset: 'custom',
        customCollapsed: newCustom
      }
    });
  };

  const toolDisplayNames: Record<string, string> = {
    'ReadTool': 'Read Tool (file content)',
    'SearchTool': 'Search Tool (grep/glob/ls results)',
    'WebTool': 'Web Tool (search/fetch results)', 
    'FallbackTool': 'Fallback Tool (unknown tool output)',
    'BashTool': 'Bash Tool (command output)',
    'EditTool': 'Edit Tool (file changes)',
    'WriteTool': 'Write Tool (new files)',
    'PlanTool': 'Plan Tool (implementation plans)'
  };

  return (
    <div className="px-6 pb-6 overflow-y-auto h-full">
      <div className="space-y-6">
        <div>
          <Label className="text-base font-semibold">Tool Collapse Behavior</Label>
          <p className="text-sm text-muted-foreground mt-1">
            Choose how tool outputs are displayed by default
          </p>
        </div>

        {/* Preset Selection */}
        <div className="space-y-3">
          <div 
            className="flex items-start gap-3 cursor-pointer"
            onClick={() => handlePresetChange('default')}
          >
            <input
              type="radio"
              name="toolCollapse"
              value="default"
              checked={toolPrefs.preset === 'default'}
              onChange={() => handlePresetChange('default')}
              className="mt-1"
            />
            <div>
              <Label className="text-sm font-medium cursor-pointer">Default Behavior</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Read, Search, Web, and Fallback tools start collapsed. Others expanded.
              </p>
            </div>
          </div>

          <div 
            className="flex items-start gap-3 cursor-pointer"
            onClick={() => handlePresetChange('minimal')}
          >
            <input
              type="radio"
              name="toolCollapse"
              value="minimal"
              checked={toolPrefs.preset === 'minimal'}
              onChange={() => handlePresetChange('minimal')}
              className="mt-1"
            />
            <div>
              <Label className="text-sm font-medium cursor-pointer">Minimal Interface</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                All tools start collapsed except Plan tool for a clean, focused view.
              </p>
            </div>
          </div>

          <div 
            className="flex items-start gap-3 cursor-pointer"
            onClick={() => handlePresetChange('custom')}
          >
            <input
              type="radio"
              name="toolCollapse"
              value="custom"
              checked={toolPrefs.preset === 'custom'}
              onChange={() => handlePresetChange('custom')}
              className="mt-1"
            />
            <div>
              <Label className="text-sm font-medium cursor-pointer">Custom Configuration</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Choose exactly which tools to collapse by default.
              </p>
            </div>
          </div>
        </div>

        {/* Custom Selection (only shown when preset = 'custom') */}
        {toolPrefs.preset === 'custom' && (
          <div className="space-y-3 pl-6 border-l-2 border-neutral-200 dark:border-neutral-700">
            <Label className="text-sm font-medium">Select tools to collapse by default:</Label>
            <div className="space-y-2">
              {ALL_COLLAPSIBLE_TOOLS.map(toolName => {
                const isCollapsed = (toolPrefs.customCollapsed || []).includes(toolName);
                return (
                  <div key={toolName} className="flex items-center space-x-2">
                    <Checkbox
                      id={`tool-${toolName}`}
                      checked={isCollapsed}
                      onCheckedChange={(checked) => 
                        handleCustomToolToggle(toolName, Boolean(checked))
                      }
                    />
                    <Label 
                      htmlFor={`tool-${toolName}`} 
                      className="text-sm font-normal cursor-pointer"
                    >
                      {toolDisplayNames[toolName] || toolName}
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}