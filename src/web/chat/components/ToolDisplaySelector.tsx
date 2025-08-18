import React from 'react';
import { Monitor } from 'lucide-react';
import { useHoverDirty } from 'react-use';
import { usePreferences } from '../hooks/usePreferences';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { cn } from '../lib/utils';

interface ToolDisplaySelectorProps {
  className?: string;
}

export function ToolDisplaySelector({ className }: ToolDisplaySelectorProps) {
  const { preferences, update } = usePreferences();
  const toolPrefs = preferences?.toolCollapse || { preset: 'default' };
  const [isOpen, setIsOpen] = React.useState(false);
  const hoverRef = React.useRef(null);
  const isHovering = useHoverDirty(hoverRef);

  const handlePresetChange = async (preset: 'default' | 'minimal' | 'custom') => {
    await update({ 
      toolCollapse: { 
        preset,
        // When switching to custom, preserve existing custom settings if available
        ...(preset === 'custom' && toolPrefs.customCollapsed ? { 
          customCollapsed: toolPrefs.customCollapsed 
        } : {})
      }
    });
  };

  const getDisplayValue = () => {
    switch (toolPrefs.preset) {
      case 'default': return 'Default';
      case 'minimal': return 'Minimal';
      case 'custom': return 'Custom';
      default: return 'Default';
    }
  };

  return (
    <TooltipProvider>
      <Tooltip open={isHovering && !isOpen}>
        <TooltipTrigger asChild>
          <div ref={hoverRef} className={cn("flex items-center gap-2", className)}>
            <Monitor size={16} className="text-muted-foreground flex-shrink-0" />
            <Select
              value={toolPrefs.preset}
              onValueChange={handlePresetChange}
              open={isOpen}
              onOpenChange={setIsOpen}
            >
              <SelectTrigger
                className="h-8 w-[100px] text-sm bg-background border-transparent hover:bg-muted focus:bg-muted"
                aria-label="Tool display settings"
              >
                <SelectValue>{getDisplayValue()}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">
                  <div>
                    <div className="font-medium">Default</div>
                    <div className="text-xs text-muted-foreground">Standard view</div>
                  </div>
                </SelectItem>
                <SelectItem value="minimal">
                  <div>
                    <div className="font-medium">Minimal</div>
                    <div className="text-xs text-muted-foreground">Clean interface</div>
                  </div>
                </SelectItem>
                <SelectItem value="custom">
                  <div>
                    <div className="font-medium">Custom</div>
                    <div className="text-xs text-muted-foreground">Your preferences</div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Tool Display Settings</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}