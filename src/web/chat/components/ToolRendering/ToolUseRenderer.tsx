import React, { useCallback, useState, useEffect } from 'react';
import type { ContentBlockParam } from '@anthropic-ai/sdk/resources/messages/messages';
import type { ChatMessage, ToolResult } from '../../types';
import { usePreferencesContext } from '../../contexts/PreferencesContext';
import { ToolLabel } from './ToolLabel';
import { ToolContent } from './ToolContent';
import styles from './ToolRendering.module.css';

interface ToolUse {
  type: 'tool_use';
  id: string;
  name: string;
  input: any;
}

interface ToolUseRendererProps {
  toolUse: ToolUse;
  toolResult?: ToolResult;
  toolResults?: Record<string, ToolResult>;
  workingDirectory?: string;
  childrenMessages?: Record<string, ChatMessage[]>;
  expandedTasks?: Set<string>;
  onToggleTaskExpanded?: (toolUseId: string) => void;
}

export const ToolUseRenderer = React.memo(function ToolUseRenderer({ 
  toolUse, 
  toolResult, 
  toolResults = {},
  workingDirectory,
  childrenMessages = {},
  expandedTasks = new Set(),
  onToggleTaskExpanded
}: ToolUseRendererProps) {
  const { toolCollapseMode, getToolDefaultCollapsed } = usePreferencesContext();
  
  // Local state for this specific tool's collapse state
  const [isCollapsed, setIsCollapsed] = useState(() => 
    getToolDefaultCollapsed(toolUse.name)
  );

  // Reset to new global default when global settings change
  useEffect(() => {
    setIsCollapsed(getToolDefaultCollapsed(toolUse.name));
  }, [toolCollapseMode, toolUse.name, getToolDefaultCollapsed]);

  const handleToggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  return (
    <>
      <ToolLabel 
        toolName={toolUse.name}
        toolInput={toolUse.input}
        workingDirectory={workingDirectory}
        isCollapsed={isCollapsed}
        onToggle={handleToggleCollapse}
      />
      <div className={`${styles.toolContentWrapper} ${isCollapsed ? styles.toolContentCollapsed : styles.toolContentExpanded}`}>
        <ToolContent
          toolName={toolUse.name}
          toolInput={toolUse.input}
          toolResult={toolResult}
          workingDirectory={workingDirectory}
          toolUseId={toolUse.id}
          childrenMessages={childrenMessages}
          toolResults={toolResults}
        />
      </div>
    </>
  );
});