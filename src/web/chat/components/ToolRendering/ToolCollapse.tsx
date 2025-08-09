import React, { useState, useEffect } from 'react';
import { CornerDownRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/web/chat/components/ui/collapsible';
import { usePreferences } from '../../hooks/usePreferences';
import { isToolCollapsedByDefault } from '../../utils/tool-collapse';

interface ToolCollapseProps {
  summaryText: string;
  toolName: string;
  children: React.ReactNode;
  ariaLabel?: string;
}

export function ToolCollapse({ 
  summaryText, 
  toolName,
  children, 
  ariaLabel 
}: ToolCollapseProps) {
  const { preferences } = usePreferences();
  
  const [isExpanded, setIsExpanded] = useState(() => 
    !isToolCollapsedByDefault(toolName, preferences?.toolCollapse)
  );
  
  // Update when preferences change
  useEffect(() => {
    setIsExpanded(!isToolCollapsedByDefault(toolName, preferences?.toolCollapse));
  }, [toolName, preferences?.toolCollapse]);
  
  return (
    <div className="flex flex-col gap-1 -mt-0.5">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <div 
            className="text-sm text-muted-foreground cursor-pointer select-none hover:text-foreground flex items-center gap-1"
            aria-label={ariaLabel || `Toggle ${summaryText.toLowerCase()} details`}
          >
            <CornerDownRight 
              size={12} 
              className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
            />
            {summaryText}
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          {children}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}