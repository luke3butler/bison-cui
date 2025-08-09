import React from 'react';
import { Globe } from 'lucide-react';
import { extractDomain } from '../../../utils/tool-utils';
import { ToolCollapse } from '../ToolCollapse';

interface WebToolProps {
  input: any;
  result: string;
  toolType: 'WebSearch' | 'WebFetch';
}

export function WebTool({ input, result, toolType }: WebToolProps) {
  const getSummaryText = (): string => {
    if (toolType === 'WebSearch') {
      // Could potentially extract timing information from result if available
      return 'Did 1 search';
    } else {
      // For WebFetch, could show size/status if available
      return 'Received content from URL';
    }
  };

  const getDomainPills = (): React.ReactNode => {
    // For WebSearch, we could parse the result to extract domains
    // For now, showing a placeholder implementation
    if (toolType === 'WebFetch' && input.url) {
      const domain = extractDomain(input.url);
      return (
        <div className="flex flex-wrap gap-1 mt-1">
          <a
            href={input.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-secondary rounded-full text-xs text-muted-foreground no-underline transition-all hover:bg-muted hover:text-foreground"
          >
            <img 
              src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`} 
              alt=""
              width={12}
              height={12}
              className="w-3 h-3 rounded-sm"
            />
            <span>{domain}</span>
          </a>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-1 -mt-0.5">
      <ToolCollapse 
        summaryText={getSummaryText()}
        toolName="WebTool"
        ariaLabel={`Toggle ${getSummaryText().toLowerCase()} details`}
      >
        {result && (
          <div className="bg-neutral-950 rounded-xl overflow-hidden">
            <pre className="m-0 p-3 text-neutral-100 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words">{result}</pre>
          </div>
        )}
      </ToolCollapse>
      {getDomainPills()}
    </div>
  );
}